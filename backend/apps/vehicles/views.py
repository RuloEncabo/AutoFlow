from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import create_audit_log
from apps.core.permissions import IsAuthenticatedAndAdminForDelete
from apps.core.viewsets import AuditModelViewSet, snapshot_instance

from .filters import VehicleFilter
from .models import Vehicle
from .serializers import VehicleSerializer, VehicleStatusSerializer


ACTIVE_WORK_ORDER_STATUSES = (
    "scheduled",
    "received",
    "estimating",
    "approved",
    "waiting_parts",
    "in_repair",
    "in_paint",
    "finished",
)


class VehicleViewSet(AuditModelViewSet):
    audit_module = "vehicles"
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = VehicleFilter
    search_fields = (
        "plate",
        "plate_normalized",
        "brand",
        "model",
        "vin",
        "client__first_name",
        "client__last_name",
        "client__document",
    )
    ordering_fields = ("plate", "brand", "model", "year", "created_at", "updated_at", "status")
    ordering = ("plate",)

    def get_queryset(self):
        return Vehicle.objects.select_related("client")

    @action(detail=False, methods=["post"], url_path="quick-create")
    def quick_create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(created_by=request.user, updated_by=request.user)
        create_audit_log(
            request=request,
            module=self.audit_module,
            action=AuditAction.CREATE,
            object_type=instance.__class__.__name__,
            object_id=instance.pk,
            new_data=snapshot_instance(instance),
        )
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="status")
    def status(self, request, pk=None):
        from apps.work_orders.models import TaskStatus, WorkOrder

        vehicle = self.get_object()
        work_order = (
            WorkOrder.objects.filter(vehicle=vehicle, status__in=ACTIVE_WORK_ORDER_STATUSES)
            .select_related("client", "vehicle")
            .prefetch_related("tasks", "tasks__operator")
            .order_by("-entry_date")
            .first()
        )
        history = (
            WorkOrder.objects.filter(vehicle=vehicle)
            .select_related("client", "vehicle")
            .order_by("-entry_date")[:5]
        )

        active_payload = None
        tasks_pending = 0
        tasks_completed = 0
        progress_percent = 0
        if work_order:
            tasks = [task for task in work_order.tasks.all() if task.status != TaskStatus.CANCELLED]
            tasks_completed = sum(1 for task in tasks if task.status == TaskStatus.COMPLETED)
            tasks_pending = sum(1 for task in tasks if task.status not in {TaskStatus.COMPLETED, TaskStatus.CANCELLED})
            progress_percent = round((tasks_completed / len(tasks)) * 100) if tasks else 0
            active_payload = {
                "id": str(work_order.id),
                "order_number": work_order.order_number,
                "status": work_order.status,
                "status_label": work_order.get_status_display(),
                "priority": work_order.priority,
                "priority_label": work_order.get_priority_display(),
                "estimated_delivery_date": work_order.estimated_delivery_date,
                "tasks": [
                    {
                        "id": str(task.id),
                        "title": task.title,
                        "status": task.status,
                        "status_label": task.get_status_display(),
                        "sector": task.sector,
                        "operator": task.operator.full_name if task.operator else "",
                    }
                    for task in tasks
                ],
            }

        payload = {
            "vehicle": VehicleSerializer(vehicle).data,
            "active_work_order": active_payload,
            "progress_percent": progress_percent,
            "tasks_pending": tasks_pending,
            "tasks_completed": tasks_completed,
            "history_summary": [
                {
                    "id": str(item.id),
                    "order_number": item.order_number,
                    "status": item.status,
                    "status_label": item.get_status_display(),
                    "entry_date": item.entry_date,
                    "estimated_delivery_date": item.estimated_delivery_date,
                    "progress_percent": item.progress_percent,
                }
                for item in history
            ],
        }
        return Response(VehicleStatusSerializer(payload).data)
