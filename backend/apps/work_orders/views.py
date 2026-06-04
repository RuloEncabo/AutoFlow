from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import create_audit_log
from apps.core.excel import build_workbook, excel_response, query_bool
from apps.core.permissions import IsWorkOrderRole
from apps.core.pdf import generate_work_order_pdf, pdf_response
from apps.core.viewsets import AuditModelViewSet, snapshot_instance

from .filters import TaskTemplateFilter, WorkOrderFilter, WorkOrderTaskFilter
from .models import TaskStatus, TaskTemplate, WorkOrder, WorkOrderStatusHistory, WorkOrderTask
from .serializers import (
    TaskTemplateSerializer,
    WorkOrderSerializer,
    WorkOrderStatusChangeSerializer,
    WorkOrderStatusHistorySerializer,
    WorkOrderTaskSerializer,
)
from .services import ensure_order_number


def _display(instance, field):
    method = getattr(instance, f"get_{field}_display", None)
    if callable(method):
        return method()
    return getattr(instance, field, "")


def _minutes(value):
    total = int(value or 0)
    hours, minutes = divmod(total, 60)
    if hours and minutes:
        return f"{hours} h {minutes} min"
    if hours:
        return f"{hours} h"
    return f"{minutes} min"


class TaskTemplateViewSet(AuditModelViewSet):
    audit_module = "task_templates"
    serializer_class = TaskTemplateSerializer
    permission_classes = [IsWorkOrderRole]
    filterset_class = TaskTemplateFilter
    search_fields = ("name", "description")
    ordering_fields = ("name", "estimated_minutes", "status", "created_at")
    ordering = ("name",)

    def get_queryset(self):
        return TaskTemplate.objects.all()

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        if query_bool(request):
            headers = [
                "Tarea catalogo",
                "Orden",
                "Cliente",
                "Vehiculo",
                "Patente",
                "Operario",
                "Estado asignacion",
                "Tiempo",
                "Costo mano de obra",
                "Sector",
                "Fecha cierre",
            ]
            usages = WorkOrderTask.objects.select_related(
                "task_template",
                "work_order",
                "work_order__client",
                "work_order__vehicle",
                "operator",
            ).filter(task_template__in=queryset)
            rows = [
                [
                    task.task_template.name if task.task_template else task.title,
                    task.work_order.order_number,
                    task.work_order.client.full_name,
                    f"{task.work_order.vehicle.brand} {task.work_order.vehicle.model}",
                    task.work_order.vehicle.plate,
                    task.operator.full_name if task.operator else "",
                    _display(task, "status"),
                    _minutes(task.estimated_minutes),
                    task.labor_cost,
                    task.sector,
                    task.finished_at,
                ]
                for task in usages
            ]
            workbook = build_workbook("Tareas con items", headers, rows)
            return excel_response(workbook, "tareas_con_items")

        headers = ["Nombre", "Descripcion", "Tiempo previsto", "Costo mano de obra", "Estado", "Creado", "Actualizado"]
        rows = [
            [task.name, task.description, _minutes(task.estimated_minutes), task.labor_cost, _display(task, "status"), task.created_at, task.updated_at]
            for task in queryset
        ]
        workbook = build_workbook("Tareas", headers, rows)
        return excel_response(workbook, "tareas")


class WorkOrderViewSet(AuditModelViewSet):
    audit_module = "work_orders"
    serializer_class = WorkOrderSerializer
    permission_classes = [IsWorkOrderRole]
    filterset_class = WorkOrderFilter
    search_fields = ("order_number", "client__first_name", "client__last_name", "vehicle__plate", "description", "notes")
    ordering_fields = ("order_number", "entry_date", "estimated_delivery_date", "priority", "status", "created_at")
    ordering = ("-entry_date",)

    def get_queryset(self):
        return WorkOrder.objects.select_related(
            "client",
            "vehicle",
            "appointment",
        ).prefetch_related(
            "tasks",
            "tasks__operator",
            "parts",
            "parts__part",
            "materials",
            "materials__material",
        )

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        ensure_order_number(instance)
        instance.save(update_fields=["order_number"])
        WorkOrderStatusHistory.objects.create(
            work_order=instance,
            old_status="",
            new_status=instance.status,
            changed_by=self.request.user,
            notes="Orden creada",
        )
        create_audit_log(
            request=self.request,
            module=self.get_audit_module(),
            action=AuditAction.CREATE,
            object_type=instance.__class__.__name__,
            object_id=instance.pk,
            new_data=snapshot_instance(instance),
        )

    @action(detail=True, methods=["post"], url_path="change-status")
    def change_status(self, request, pk=None):
        work_order = self.get_object()
        serializer = WorkOrderStatusChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        old_data = snapshot_instance(work_order)
        old_status = work_order.status
        work_order.status = serializer.validated_data["status"]
        work_order.updated_by = request.user
        if work_order.status == "delivered" and not work_order.actual_delivery_date:
            work_order.actual_delivery_date = timezone.localdate()
        work_order.save(update_fields=["status", "updated_by", "updated_at", "actual_delivery_date"])
        WorkOrderStatusHistory.objects.create(
            work_order=work_order,
            old_status=old_status,
            new_status=work_order.status,
            changed_by=request.user,
            notes=serializer.validated_data.get("notes", ""),
        )
        create_audit_log(
            request=request,
            module=self.audit_module,
            action=AuditAction.STATUS_CHANGE,
            object_type="WorkOrder",
            object_id=work_order.pk,
            old_data=old_data,
            new_data=snapshot_instance(work_order),
        )
        return Response(self.get_serializer(work_order).data)

    @action(detail=True, methods=["get"])
    def status_history(self, request, pk=None):
        work_order = self.get_object()
        return Response(WorkOrderStatusHistorySerializer(work_order.status_history.all(), many=True).data)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        work_order = self.get_object()
        return pdf_response(generate_work_order_pdf(work_order), f"orden_{work_order.order_number}")

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        if query_bool(request):
            headers = [
                "Orden",
                "Cliente",
                "Vehiculo",
                "Patente",
                "Tipo item",
                "Codigo/Tarea",
                "Detalle",
                "Cantidad/Tiempo",
                "Operario/Estado",
                "Costo unitario",
                "Total",
            ]
            rows = []
            for order in queryset:
                has_items = False
                for task in order.tasks.exclude(status=TaskStatus.CANCELLED).select_related("operator", "task_template").order_by("execution_order", "created_at"):
                    has_items = True
                    rows.append(
                        [
                            order.order_number,
                            order.client.full_name,
                            f"{order.vehicle.brand} {order.vehicle.model}",
                            order.vehicle.plate,
                            "Tarea",
                            task.task_template.name if task.task_template else task.title,
                            task.description or task.title,
                            _minutes(task.estimated_minutes),
                            task.operator.full_name if task.operator else _display(task, "status"),
                            "",
                            task.labor_cost,
                        ]
                    )
                for item in order.parts.exclude(status="returned").select_related("part").order_by("created_at"):
                    has_items = True
                    rows.append(
                        [
                            order.order_number,
                            order.client.full_name,
                            f"{order.vehicle.brand} {order.vehicle.model}",
                            order.vehicle.plate,
                            "Repuesto",
                            item.part.code,
                            item.part.name,
                            item.quantity,
                            _display(item, "status"),
                            item.unit_cost,
                            item.total_cost,
                        ]
                    )
                for item in order.materials.exclude(status="returned").select_related("material").order_by("created_at"):
                    has_items = True
                    rows.append(
                        [
                            order.order_number,
                            order.client.full_name,
                            f"{order.vehicle.brand} {order.vehicle.model}",
                            order.vehicle.plate,
                            "Material",
                            item.material.code,
                            item.material.name,
                            item.quantity,
                            _display(item, "status"),
                            item.unit_cost,
                            item.total_cost,
                        ]
                    )
                if not has_items:
                    rows.append([order.order_number, order.client.full_name, f"{order.vehicle.brand} {order.vehicle.model}", order.vehicle.plate, "Sin items", "", "", "", "", "", ""])
            workbook = build_workbook("Ordenes con items", headers, rows)
            return excel_response(workbook, "ordenes_con_items")

        headers = [
            "Orden",
            "Cliente",
            "Vehiculo",
            "Patente",
            "Estado",
            "Prioridad",
            "Ingreso",
            "Entrega estimada",
            "Tareas",
            "Avance %",
            "Mano de obra",
            "Materiales",
            "Repuestos",
            "Subtotal",
        ]
        rows = [
            [
                order.order_number,
                order.client.full_name,
                f"{order.vehicle.brand} {order.vehicle.model}",
                order.vehicle.plate,
                _display(order, "status"),
                _display(order, "priority"),
                order.entry_date,
                order.estimated_delivery_date,
                f"{order.tasks_completed}/{order.tasks_total}",
                order.progress_percent,
                order.labor_amount,
                order.materials_amount,
                order.parts_amount,
                order.subtotal_amount,
            ]
            for order in queryset
        ]
        workbook = build_workbook("Ordenes de trabajo", headers, rows)
        return excel_response(workbook, "ordenes")

    @action(detail=True, methods=["get", "post"])
    def tasks(self, request, pk=None):
        work_order = self.get_object()
        if request.method == "GET":
            return Response(WorkOrderTaskSerializer(work_order.tasks.all(), many=True).data)
        serializer = WorkOrderTaskSerializer(data={**request.data, "work_order": str(work_order.pk)})
        serializer.is_valid(raise_exception=True)
        task = serializer.save(created_by=request.user, updated_by=request.user)
        return Response(WorkOrderTaskSerializer(task).data, status=status.HTTP_201_CREATED)


class WorkOrderTaskViewSet(AuditModelViewSet):
    audit_module = "work_order_tasks"
    serializer_class = WorkOrderTaskSerializer
    permission_classes = [IsWorkOrderRole]
    filterset_class = WorkOrderTaskFilter
    search_fields = ("title", "description", "sector", "work_order__order_number")
    ordering_fields = ("execution_order", "estimated_date", "status", "priority", "created_at")
    ordering = ("work_order", "execution_order")

    def get_queryset(self):
        return WorkOrderTask.objects.select_related(
            "work_order",
            "task_template",
            "responsible",
            "operator",
        )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        task = self.get_object()
        task.status = TaskStatus.IN_PROGRESS
        task.started_at = task.started_at or timezone.now()
        task.updated_by = request.user
        task.save(update_fields=["status", "started_at", "updated_by", "updated_at"])
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = TaskStatus.COMPLETED
        task.finished_at = timezone.now()
        task.updated_by = request.user
        task.save(update_fields=["status", "finished_at", "updated_by", "updated_at"])
        return Response(self.get_serializer(task).data)
