from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Callable

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.appointments.models import Appointment, AppointmentStatus
from apps.billing.models import Invoice, PaymentStatus
from apps.core.permissions import ADMIN_ROLE, ADMINISTRATION_ROLE, OPERATIVE_ROLES
from apps.core.utils import normalize_plate
from apps.inventory.models import InventoryStatus, Material, Part
from apps.vehicles.models import Vehicle
from apps.work_orders.models import Priority, TaskStatus, WorkOrder, WorkOrderStatus, WorkOrderTask


ALL_CHATBOT_ROLES = {ADMIN_ROLE, ADMINISTRATION_ROLE, *OPERATIVE_ROLES}
FINANCIAL_ROLES = {ADMIN_ROLE, ADMINISTRATION_ROLE}

ACTIVE_WORK_ORDER_STATUSES = (
    WorkOrderStatus.SCHEDULED,
    WorkOrderStatus.RECEIVED,
    WorkOrderStatus.ESTIMATING,
    WorkOrderStatus.APPROVED,
    WorkOrderStatus.WAITING_PARTS,
    WorkOrderStatus.IN_REPAIR,
    WorkOrderStatus.IN_PAINT,
    WorkOrderStatus.FINISHED,
)

PRIORITY_RANK = {
    Priority.URGENT: 0,
    Priority.HIGH: 1,
    Priority.NORMAL: 2,
    Priority.LOW: 3,
}


class ChatbotToolError(Exception):
    pass


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Callable[[dict[str, Any]], dict[str, Any]]
    allowed_roles: set[str]
    requires_confirmation: bool = False

    def as_openai_tool(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


def _decimal(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _date(value: Any) -> str | None:
    return value.isoformat() if value else None


def _datetime(value: Any) -> str | None:
    return value.isoformat() if value else None


def _limit(arguments: dict[str, Any], default: int = 10, maximum: int = 50) -> int:
    try:
        value = int(arguments.get("limit") or default)
    except (TypeError, ValueError):
        value = default
    return max(1, min(value, maximum))


def _vehicle_label(vehicle) -> str:
    return f"{vehicle.brand} {vehicle.model}".strip()


def _serialize_work_order(order: WorkOrder) -> dict[str, Any]:
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "client": order.client.full_name,
        "vehicle": _vehicle_label(order.vehicle),
        "plate": order.vehicle.plate,
        "status": order.status,
        "status_label": order.get_status_display(),
        "priority": order.priority,
        "priority_label": order.get_priority_display(),
        "entry_date": _datetime(order.entry_date),
        "estimated_delivery_date": _date(order.estimated_delivery_date),
        "tasks_total": order.tasks_total,
        "tasks_completed": order.tasks_completed,
        "tasks_pending": order.tasks_pending,
        "progress_percent": order.progress_percent,
    }


def _stock_row(item, item_type: str) -> dict[str, Any]:
    family = getattr(item, "family", None)
    return {
        "id": str(item.id),
        "type": item_type,
        "code": item.code,
        "supplier_code": item.supplier_code,
        "name": item.name,
        "family": family.name if family else "",
        "stock": _decimal(item.stock),
        "min_stock": _decimal(item.min_stock),
        "cost": _decimal(item.cost),
    }


class ToolRegistry:
    def __init__(self, user, enabled_tools: list[str] | None = None):
        self.user = user
        self.user_role = getattr(user, "role", "")
        self.enabled_tools = set(enabled_tools or [])
        self._definitions = self._build_definitions()

    def _build_definitions(self) -> dict[str, ToolDefinition]:
        return {
            "get_vehicle_status": ToolDefinition(
                name="get_vehicle_status",
                description="Consulta estado operativo, orden activa e historial resumido de un vehiculo por patente.",
                parameters={
                    "type": "object",
                    "properties": {
                        "plate": {"type": "string", "description": "Patente o dominio del vehiculo."},
                    },
                    "required": ["plate"],
                    "additionalProperties": False,
                },
                handler=self.get_vehicle_status,
                allowed_roles=ALL_CHATBOT_ROLES,
            ),
            "get_active_work_orders": ToolDefinition(
                name="get_active_work_orders",
                description="Lista ordenes de trabajo activas con filtros opcionales por estado, prioridad o sector.",
                parameters={
                    "type": "object",
                    "properties": {
                        "status": {"type": "string"},
                        "priority": {"type": "string"},
                        "sector": {"type": "string"},
                        "limit": {"type": "integer", "minimum": 1, "maximum": 20},
                    },
                    "additionalProperties": False,
                },
                handler=self.get_active_work_orders,
                allowed_roles=ALL_CHATBOT_ROLES,
            ),
            "get_overdue_work_orders": ToolDefinition(
                name="get_overdue_work_orders",
                description="Lista ordenes activas con fecha estimada de entrega vencida.",
                parameters={
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "minimum": 1, "maximum": 20},
                    },
                    "additionalProperties": False,
                },
                handler=self.get_overdue_work_orders,
                allowed_roles=ALL_CHATBOT_ROLES,
            ),
            "get_work_order_tasks": ToolDefinition(
                name="get_work_order_tasks",
                description="Obtiene tareas de una orden de trabajo por ID u numero de orden.",
                parameters={
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "string"},
                        "order_number": {"type": "string"},
                        "status": {"type": "string"},
                    },
                    "additionalProperties": False,
                },
                handler=self.get_work_order_tasks,
                allowed_roles=ALL_CHATBOT_ROLES,
            ),
            "get_stock_alert": ToolDefinition(
                name="get_stock_alert",
                description="Lista repuestos y materiales con stock critico.",
                parameters={
                    "type": "object",
                    "properties": {
                        "kind": {"type": "string", "enum": ["all", "parts", "materials"]},
                        "limit": {"type": "integer", "minimum": 1, "maximum": 50},
                    },
                    "additionalProperties": False,
                },
                handler=self.get_stock_alert,
                allowed_roles=ALL_CHATBOT_ROLES,
            ),
            "get_dashboard_summary": ToolDefinition(
                name="get_dashboard_summary",
                description="Obtiene resumen operativo y financiero segun permisos del usuario.",
                parameters={
                    "type": "object",
                    "properties": {
                        "scope": {"type": "string", "enum": ["operational", "financial", "all"]},
                    },
                    "additionalProperties": False,
                },
                handler=self.get_dashboard_summary,
                allowed_roles=ALL_CHATBOT_ROLES,
            ),
        }

    def available_definitions(self) -> list[ToolDefinition]:
        definitions = []
        for definition in self._definitions.values():
            if self.user_role not in definition.allowed_roles:
                continue
            if self.enabled_tools and definition.name not in self.enabled_tools:
                continue
            definitions.append(definition)
        return definitions

    def openai_tools(self) -> list[dict[str, Any]]:
        return [definition.as_openai_tool() for definition in self.available_definitions()]

    def execute(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        definition = self._definitions.get(name)
        if not definition:
            raise ChatbotToolError(f"La tool {name} no existe.")
        available_names = {item.name for item in self.available_definitions()}
        if name not in available_names:
            raise ChatbotToolError(f"No tiene permisos para ejecutar {name}.")
        return definition.handler(arguments or {})

    def get_vehicle_status(self, arguments: dict[str, Any]) -> dict[str, Any]:
        plate = str(arguments.get("plate") or "").strip()
        if not plate:
            raise ChatbotToolError("La patente es obligatoria.")

        vehicle = (
            Vehicle.objects.select_related("client")
            .filter(plate_normalized=normalize_plate(plate))
            .first()
        )
        if not vehicle:
            return {
                "found": False,
                "message": f"No se encontro un vehiculo con patente {plate.upper()}.",
                "rich_content": [{"type": "error", "title": "Vehiculo no encontrado", "message": plate.upper()}],
            }

        active_order = (
            WorkOrder.objects.select_related("client", "vehicle")
            .prefetch_related("tasks", "tasks__operator")
            .filter(vehicle=vehicle, status__in=ACTIVE_WORK_ORDER_STATUSES)
            .order_by("-entry_date")
            .first()
        )
        history = (
            WorkOrder.objects.select_related("client", "vehicle")
            .filter(vehicle=vehicle)
            .order_by("-entry_date")[:5]
        )

        active_payload = _serialize_work_order(active_order) if active_order else None
        pending_tasks = []
        if active_order:
            pending_tasks = [
                {
                    "id": str(task.id),
                    "title": task.title,
                    "status": task.status,
                    "status_label": task.get_status_display(),
                    "sector": task.sector,
                    "operator": task.operator.full_name if task.operator else "",
                }
                for task in active_order.tasks.all()
                if task.status not in {TaskStatus.COMPLETED, TaskStatus.CANCELLED}
            ][:5]

        return {
            "found": True,
            "vehicle": {
                "id": str(vehicle.id),
                "plate": vehicle.plate,
                "brand": vehicle.brand,
                "model": vehicle.model,
                "year": vehicle.year,
                "color": vehicle.color,
                "status": vehicle.status,
                "status_label": vehicle.get_status_display(),
            },
            "client": {
                "id": str(vehicle.client_id),
                "name": vehicle.client.full_name,
                "phone": vehicle.client.phone,
                "email": vehicle.client.email,
            },
            "active_work_order": active_payload,
            "pending_tasks": pending_tasks,
            "history_summary": [_serialize_work_order(order) for order in history],
            "rich_content": [
                {
                    "type": "vehicle_card",
                    "title": f"{vehicle.plate} - {_vehicle_label(vehicle)}",
                    "status": active_payload["status_label"] if active_payload else vehicle.get_status_display(),
                    "items": [
                        {"label": "Cliente", "value": vehicle.client.full_name},
                        {"label": "Color", "value": vehicle.color or "Sin dato"},
                        {"label": "Orden activa", "value": active_payload["order_number"] if active_payload else "Sin orden activa"},
                    ],
                }
            ],
        }

    def get_active_work_orders(self, arguments: dict[str, Any]) -> dict[str, Any]:
        limit = _limit(arguments, default=10, maximum=20)
        queryset = WorkOrder.objects.select_related("client", "vehicle").filter(status__in=ACTIVE_WORK_ORDER_STATUSES)
        status = str(arguments.get("status") or "").strip()
        priority = str(arguments.get("priority") or "").strip()
        sector = str(arguments.get("sector") or "").strip()
        if status:
            queryset = queryset.filter(status=status)
        if priority:
            queryset = queryset.filter(priority=priority)
        if sector:
            queryset = queryset.filter(tasks__sector__icontains=sector).distinct()

        orders = list(queryset.prefetch_related("tasks").order_by("estimated_delivery_date", "-entry_date")[:limit])
        rows = [_serialize_work_order(order) for order in orders]
        return {
            "count": queryset.count(),
            "rows": rows,
            "rich_content": [
                {
                    "type": "work_order_table",
                    "title": "Ordenes activas",
                    "columns": ["OT", "Cliente", "Patente", "Estado", "Avance"],
                    "rows": [
                        [
                            row["order_number"],
                            row["client"],
                            row["plate"],
                            row["status_label"],
                            f"{row['progress_percent']}%",
                        ]
                        for row in rows
                    ],
                }
            ],
        }

    def get_overdue_work_orders(self, arguments: dict[str, Any]) -> dict[str, Any]:
        limit = _limit(arguments, default=10, maximum=20)
        today = timezone.localdate()
        queryset = (
            WorkOrder.objects.select_related("client", "vehicle")
            .filter(status__in=ACTIVE_WORK_ORDER_STATUSES, estimated_delivery_date__lt=today)
            .prefetch_related("tasks")
            .order_by("estimated_delivery_date", "-priority")
        )
        rows = [_serialize_work_order(order) for order in queryset[:limit]]
        return {
            "today": today.isoformat(),
            "count": queryset.count(),
            "rows": rows,
            "rich_content": [
                {
                    "type": "work_order_table",
                    "title": "Ordenes retrasadas",
                    "columns": ["OT", "Cliente", "Patente", "Entrega", "Estado"],
                    "rows": [
                        [
                            row["order_number"],
                            row["client"],
                            row["plate"],
                            row["estimated_delivery_date"],
                            row["status_label"],
                        ]
                        for row in rows
                    ],
                }
            ],
        }

    def get_work_order_tasks(self, arguments: dict[str, Any]) -> dict[str, Any]:
        order_id = str(arguments.get("order_id") or "").strip()
        order_number = str(arguments.get("order_number") or "").strip()
        if not order_id and not order_number:
            raise ChatbotToolError("Debe indicar order_id u order_number.")

        queryset = WorkOrder.objects.select_related("client", "vehicle")
        order = queryset.filter(id=order_id).first() if order_id else None
        if not order and order_number:
            order = queryset.filter(order_number__iexact=order_number).first()
        if not order:
            return {"found": False, "message": "No se encontro la orden de trabajo.", "rich_content": []}

        tasks = WorkOrderTask.objects.select_related("operator", "task_template", "responsible").filter(work_order=order)
        status = str(arguments.get("status") or "").strip()
        if status:
            tasks = tasks.filter(status=status)

        rows = [
            {
                "id": str(task.id),
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "status_label": task.get_status_display(),
                "priority": task.priority,
                "priority_label": task.get_priority_display(),
                "operator": task.operator.full_name if task.operator else "",
                "sector": task.sector,
                "execution_order": task.execution_order,
                "estimated_minutes": task.estimated_minutes,
                "labor_cost": _decimal(task.labor_cost),
                "estimated_date": _date(task.estimated_date),
                "started_at": _datetime(task.started_at),
                "finished_at": _datetime(task.finished_at),
            }
            for task in tasks.order_by("execution_order", "created_at")
        ]
        return {
            "found": True,
            "work_order": _serialize_work_order(order),
            "count": len(rows),
            "rows": rows,
            "rich_content": [
                {
                    "type": "task_list",
                    "title": f"Tareas {order.order_number}",
                    "rows": rows,
                }
            ],
        }

    def get_stock_alert(self, arguments: dict[str, Any]) -> dict[str, Any]:
        kind = str(arguments.get("kind") or "all").strip().lower()
        limit = _limit(arguments, default=20, maximum=50)
        parts = []
        materials = []
        if kind in {"all", "parts"}:
            parts = [
                _stock_row(item, "repuesto")
                for item in Part.objects.select_related("family")
                .filter(status=InventoryStatus.ACTIVE, stock__lte=F("min_stock"))
                .order_by("stock", "code")[:limit]
            ]
        if kind in {"all", "materials"}:
            materials = [
                _stock_row(item, "material")
                for item in Material.objects.select_related("family")
                .filter(status=InventoryStatus.ACTIVE, stock__lte=F("min_stock"))
                .order_by("stock", "code")[:limit]
            ]
        rows = parts + materials
        return {
            "count": len(rows),
            "parts": parts,
            "materials": materials,
            "rich_content": [
                {
                    "type": "stock_table",
                    "title": "Stock critico",
                    "columns": ["Tipo", "Codigo", "Nombre", "Stock", "Minimo"],
                    "rows": [
                        [row["type"], row["code"], row["name"], row["stock"], row["min_stock"]]
                        for row in rows
                    ],
                }
            ],
        }

    def get_dashboard_summary(self, arguments: dict[str, Any]) -> dict[str, Any]:
        scope = str(arguments.get("scope") or "operational").strip().lower()
        today = timezone.localdate()
        month_start = today.replace(day=1)
        active_orders = WorkOrder.objects.filter(status__in=ACTIVE_WORK_ORDER_STATUSES)
        appointments_today = Appointment.objects.filter(scheduled_at__date=today)
        appointment_counts = {
            item["status"]: item["count"]
            for item in appointments_today.values("status").annotate(count=Count("id"))
        }
        critical_parts = Part.objects.filter(status=InventoryStatus.ACTIVE, stock__lte=F("min_stock")).count()
        critical_materials = Material.objects.filter(status=InventoryStatus.ACTIVE, stock__lte=F("min_stock")).count()

        payload: dict[str, Any] = {
            "generated_at": timezone.now().isoformat(),
            "scope": scope,
            "operational": {
                "active_orders": active_orders.count(),
                "delayed_orders": active_orders.filter(estimated_delivery_date__lt=today).count(),
                "vehicles_in_shop": active_orders.values("vehicle_id").distinct().count(),
                "orders_in_repair": active_orders.filter(
                    status__in=[WorkOrderStatus.IN_REPAIR, WorkOrderStatus.IN_PAINT]
                ).count(),
                "today_appointments": appointments_today.count(),
                "today_appointments_confirmed": appointment_counts.get(AppointmentStatus.CONFIRMED, 0),
                "today_appointments_scheduled": appointment_counts.get(AppointmentStatus.SCHEDULED, 0),
                "critical_stock": critical_parts + critical_materials,
            },
        }

        if scope in {"financial", "all"} and self.user_role in FINANCIAL_ROLES:
            month_invoices = Invoice.objects.filter(issued_at__date__gte=month_start)
            pending_invoices = Invoice.objects.filter(payment_status__in=[PaymentStatus.PENDING, PaymentStatus.PARTIAL])
            payload["financial"] = {
                "month_total": _decimal(month_invoices.aggregate(total=Coalesce(Sum("total"), Decimal("0")))["total"]),
                "pending_total": _decimal(pending_invoices.aggregate(total=Coalesce(Sum("total"), Decimal("0")))["total"]),
                "pending_count": pending_invoices.count(),
                "paid_month_count": month_invoices.filter(payment_status=PaymentStatus.PAID).count(),
            }
        elif scope in {"financial", "all"}:
            payload["financial"] = {"restricted": True, "message": "El usuario no tiene permisos financieros."}

        payload["rich_content"] = [
            {
                "type": "dashboard_metrics",
                "title": "Resumen operativo",
                "items": [
                    {"label": "Ordenes activas", "value": payload["operational"]["active_orders"]},
                    {"label": "Ordenes retrasadas", "value": payload["operational"]["delayed_orders"]},
                    {"label": "Turnos hoy", "value": payload["operational"]["today_appointments"]},
                    {"label": "Stock critico", "value": payload["operational"]["critical_stock"]},
                ],
            }
        ]
        return payload
