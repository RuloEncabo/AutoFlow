from __future__ import annotations

from decimal import Decimal

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.models import Appointment, AppointmentStatus
from apps.audit.models import AuditLog
from apps.billing.models import Invoice, PaymentStatus
from apps.inventory.models import InventoryStatus, Material, Part
from apps.work_orders.models import Priority, TaskStatus, WorkOrder, WorkOrderStatus, WorkOrderTask

from .serializers import OperationalDashboardSerializer, TvDashboardSerializer


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

TV_STATUS_RANK = {
    WorkOrderStatus.IN_REPAIR: 0,
    WorkOrderStatus.IN_PAINT: 1,
    WorkOrderStatus.WAITING_PARTS: 2,
    WorkOrderStatus.APPROVED: 3,
    WorkOrderStatus.RECEIVED: 4,
    WorkOrderStatus.ESTIMATING: 5,
    WorkOrderStatus.FINISHED: 6,
    WorkOrderStatus.SCHEDULED: 7,
}


def _active_work_orders():
    return WorkOrder.objects.filter(status__in=ACTIVE_WORK_ORDER_STATUSES).select_related("client", "vehicle")


def _money(value):
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return value


def _date_sort_value(value):
    return value or timezone.datetime.max.date()


def _serialize_priority(order, today):
    return {
        "id": order.id,
        "order_number": order.order_number,
        "client_name": order.client.full_name,
        "vehicle_label": f"{order.vehicle.brand} {order.vehicle.model}",
        "plate": order.vehicle.plate,
        "status": order.status,
        "status_label": order.get_status_display(),
        "priority": order.priority,
        "priority_label": order.get_priority_display(),
        "estimated_delivery_date": order.estimated_delivery_date,
        "progress_percent": order.progress_percent,
        "delayed": bool(order.estimated_delivery_date and order.estimated_delivery_date < today),
    }


def _serialize_tv_order(order):
    tasks = [task for task in order.tasks.all() if task.status != TaskStatus.CANCELLED]
    completed = sum(1 for task in tasks if task.status == TaskStatus.COMPLETED)
    pending_tasks = [task for task in tasks if task.status not in {TaskStatus.COMPLETED, TaskStatus.CANCELLED}]
    in_progress = [task for task in pending_tasks if task.status == TaskStatus.IN_PROGRESS]
    next_tasks = sorted(pending_tasks, key=lambda task: (task.execution_order, task.created_at))[:3]
    operators = []
    for task in tasks:
        if task.operator and task.operator.full_name not in operators:
            operators.append(task.operator.full_name)

    total = len(tasks)
    pending = len(pending_tasks)
    progress = round((completed / total) * 100) if total else 0
    current_task = (in_progress or pending_tasks or [None])[0]

    return {
        "id": order.id,
        "order_number": order.order_number,
        "client": order.client.full_name,
        "vehicle": f"{order.vehicle.brand} {order.vehicle.model}",
        "plate": order.vehicle.plate,
        "status": order.status,
        "status_label": order.get_status_display(),
        "priority": order.priority,
        "priority_label": order.get_priority_display(),
        "estimated_delivery_date": order.estimated_delivery_date,
        "tasks_total": total,
        "tasks_completed": completed,
        "tasks_pending": pending,
        "progress_percent": progress,
        "next_tasks": [
            {
                "id": str(task.id),
                "title": task.title,
                "sector": task.sector,
                "operator": task.operator.full_name if task.operator else "",
                "status": task.status,
                "status_label": task.get_status_display(),
            }
            for task in next_tasks
        ],
        "sector_current": current_task.sector if current_task and current_task.sector else "Sin sector",
        "operators": operators,
    }


class OperationalDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today = timezone.localdate()
        month_start = today.replace(day=1)
        active_orders = _active_work_orders()

        appointments_today = Appointment.objects.filter(
            scheduled_at__date=today,
        )
        appointment_counts = {
            item["status"]: item["count"]
            for item in appointments_today.values("status").annotate(count=Count("id"))
        }

        critical_parts = Part.objects.filter(
            status=InventoryStatus.ACTIVE,
            stock__lte=F("min_stock"),
        ).count()
        critical_materials = Material.objects.filter(
            status=InventoryStatus.ACTIVE,
            stock__lte=F("min_stock"),
        ).count()

        month_invoices = Invoice.objects.filter(issued_at__date__gte=month_start)
        month_total = month_invoices.aggregate(total=Coalesce(Sum("total"), Decimal("0")))["total"]
        pending_invoices = Invoice.objects.filter(payment_status__in=[PaymentStatus.PENDING, PaymentStatus.PARTIAL])
        pending_total = pending_invoices.aggregate(total=Coalesce(Sum("total"), Decimal("0")))["total"]

        active_order_ids = active_orders.values("id")
        task_base = WorkOrderTask.objects.filter(work_order_id__in=active_order_ids).exclude(status=TaskStatus.CANCELLED)
        task_counts = {item["status"]: item["count"] for item in task_base.values("status").annotate(count=Count("id"))}
        operator_rows = (
            task_base.filter(status__in=[TaskStatus.PENDING, TaskStatus.IN_PROGRESS])
            .values("operator__first_name", "operator__last_name", "operator__task_type")
            .annotate(
                total=Count("id"),
                in_progress=Count("id", filter=Q(status=TaskStatus.IN_PROGRESS)),
            )
            .order_by("-total")[:8]
        )

        priority_candidates = list(
            active_orders.filter(
                Q(priority__in=[Priority.HIGH, Priority.URGENT])
                | Q(estimated_delivery_date__lt=today)
                | Q(status__in=[WorkOrderStatus.IN_REPAIR, WorkOrderStatus.IN_PAINT, WorkOrderStatus.WAITING_PARTS])
            )
            .prefetch_related("tasks")[:50]
        )
        priority_candidates.sort(
            key=lambda order: (
                0 if order.estimated_delivery_date and order.estimated_delivery_date < today else 1,
                PRIORITY_RANK.get(order.priority, 9),
                _date_sort_value(order.estimated_delivery_date),
            )
        )

        recent_activity = [
            {
                "id": item.id,
                "user": item.user.email if item.user else "sistema",
                "module": item.module,
                "action": item.get_action_display(),
                "created_at": item.created_at,
            }
            for item in AuditLog.objects.select_related("user").all()[:8]
        ]

        payload = {
            "generated_at": now,
            "stats": {
                "active_orders": active_orders.count(),
                "delayed_orders": active_orders.filter(estimated_delivery_date__lt=today).count(),
                "vehicles_in_shop": active_orders.values("vehicle_id").distinct().count(),
                "orders_in_repair": active_orders.filter(
                    status__in=[WorkOrderStatus.IN_REPAIR, WorkOrderStatus.IN_PAINT]
                ).count(),
                "today_appointments": appointments_today.count(),
                "critical_stock": critical_parts + critical_materials,
            },
            "appointments_today": {
                "total": appointments_today.count(),
                "scheduled": appointment_counts.get(AppointmentStatus.SCHEDULED, 0),
                "confirmed": appointment_counts.get(AppointmentStatus.CONFIRMED, 0),
                "cancelled": appointment_counts.get(AppointmentStatus.CANCELLED, 0),
                "completed": appointment_counts.get(AppointmentStatus.COMPLETED, 0),
            },
            "stock": {
                "critical_total": critical_parts + critical_materials,
                "critical_parts": critical_parts,
                "critical_materials": critical_materials,
            },
            "billing": {
                "month_total": _money(month_total),
                "pending_total": _money(pending_total),
                "pending_count": pending_invoices.count(),
                "paid_month_count": month_invoices.filter(payment_status=PaymentStatus.PAID).count(),
            },
            "tasks": {
                "pending": task_counts.get(TaskStatus.PENDING, 0),
                "in_progress": task_counts.get(TaskStatus.IN_PROGRESS, 0),
                "completed": task_counts.get(TaskStatus.COMPLETED, 0),
                "by_operator": [
                    {
                        "operator": (
                            f"{row['operator__first_name'] or ''} {row['operator__last_name'] or ''}".strip()
                            or "Sin operario"
                        ),
                        "task_type": row["operator__task_type"] or "",
                        "total": row["total"],
                        "in_progress": row["in_progress"],
                    }
                    for row in operator_rows
                ],
            },
            "priorities": [_serialize_priority(order, today) for order in priority_candidates[:8]],
            "recent_activity": recent_activity,
        }
        return Response(OperationalDashboardSerializer(payload).data)


class TvWorkOrdersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = list(
            _active_work_orders()
            .prefetch_related("tasks", "tasks__operator")
            .filter(status__in=ACTIVE_WORK_ORDER_STATUSES)[:80]
        )
        orders.sort(
            key=lambda order: (
                TV_STATUS_RANK.get(order.status, 9),
                PRIORITY_RANK.get(order.priority, 9),
                _date_sort_value(order.estimated_delivery_date),
            )
        )
        payload = {
            "generated_at": timezone.now(),
            "rows": [_serialize_tv_order(order) for order in orders[:10]],
        }
        return Response(TvDashboardSerializer(payload).data)
