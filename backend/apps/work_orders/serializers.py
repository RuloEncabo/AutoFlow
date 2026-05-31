from django.utils import timezone
from rest_framework import serializers

from .models import (
    TaskStatus,
    TaskTemplate,
    TaskTemplateStatus,
    WorkOrder,
    WorkOrderStatus,
    WorkOrderStatusHistory,
    WorkOrderTask,
)


class TaskTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskTemplate
        fields = (
            "id",
            "name",
            "description",
            "estimated_minutes",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre de la tarea es obligatorio.")
        return value

    def validate_estimated_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError("El tiempo previsto debe ser mayor a cero.")
        return value


class WorkOrderTaskSerializer(serializers.ModelSerializer):
    responsible_email = serializers.CharField(source="responsible.email", read_only=True)
    task_template_name = serializers.CharField(source="task_template.name", read_only=True)
    operator_name = serializers.CharField(source="operator.full_name", read_only=True)
    operator_task_type = serializers.CharField(source="operator.task_type", read_only=True)

    class Meta:
        model = WorkOrderTask
        fields = (
            "id",
            "work_order",
            "task_template",
            "task_template_name",
            "title",
            "description",
            "status",
            "priority",
            "responsible",
            "responsible_email",
            "operator",
            "operator_name",
            "operator_task_type",
            "sector",
            "execution_order",
            "estimated_minutes",
            "estimated_date",
            "started_at",
            "finished_at",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "task_template_name",
            "responsible_email",
            "operator_name",
            "operator_task_type",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "title": {"required": False, "allow_blank": True},
            "description": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        task_template = attrs.get("task_template", getattr(self.instance, "task_template", None))
        title = attrs.get("title", getattr(self.instance, "title", ""))
        operator = attrs.get("operator", getattr(self.instance, "operator", None))

        if not task_template and not str(title).strip():
            raise serializers.ValidationError({"task_template": "Seleccione una tarea o cargue un titulo."})
        if not operator:
            raise serializers.ValidationError({"operator": "Debe asignar un operario a la tarea."})
        if task_template and task_template.status != TaskTemplateStatus.ACTIVE:
            raise serializers.ValidationError({"task_template": "La tarea seleccionada no esta activa."})
        return attrs

    def _apply_template_defaults(self, validated_data):
        task_template = validated_data.get("task_template")
        if not task_template:
            return validated_data
        if not validated_data.get("title"):
            validated_data["title"] = task_template.name
        if not validated_data.get("description"):
            validated_data["description"] = task_template.description
        if not validated_data.get("estimated_minutes"):
            validated_data["estimated_minutes"] = task_template.estimated_minutes
        return validated_data

    def create(self, validated_data):
        return super().create(self._apply_template_defaults(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._apply_template_defaults(validated_data))


class WorkOrderSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    vehicle_label = serializers.SerializerMethodField()
    tasks_total = serializers.IntegerField(read_only=True)
    tasks_completed = serializers.IntegerField(read_only=True)
    tasks_pending = serializers.SerializerMethodField()
    progress_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkOrder
        fields = (
            "id",
            "order_number",
            "client",
            "client_name",
            "vehicle",
            "vehicle_label",
            "appointment",
            "entry_date",
            "estimated_delivery_date",
            "actual_delivery_date",
            "priority",
            "description",
            "notes",
            "status",
            "tasks_total",
            "tasks_completed",
            "tasks_pending",
            "progress_percent",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "order_number",
            "client_name",
            "vehicle_label",
            "tasks_total",
            "tasks_completed",
            "tasks_pending",
            "progress_percent",
            "created_at",
            "updated_at",
        )

    def get_vehicle_label(self, obj):
        return f"{obj.vehicle.plate} - {obj.vehicle.brand} {obj.vehicle.model}"

    def get_tasks_pending(self, obj):
        return obj.tasks.exclude(status__in=[TaskStatus.COMPLETED, TaskStatus.CANCELLED]).count()

    def validate(self, attrs):
        client = attrs.get("client", getattr(self.instance, "client", None))
        vehicle = attrs.get("vehicle", getattr(self.instance, "vehicle", None))
        if client and vehicle and vehicle.client_id != client.id:
            raise serializers.ValidationError({"vehicle": "El vehiculo no pertenece al cliente seleccionado."})
        description = attrs.get("description", getattr(self.instance, "description", "")).strip()
        if not description:
            raise serializers.ValidationError({"description": "La descripcion es obligatoria."})
        return attrs


class WorkOrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.CharField(source="changed_by.email", read_only=True)

    class Meta:
        model = WorkOrderStatusHistory
        fields = (
            "id",
            "work_order",
            "old_status",
            "new_status",
            "changed_by",
            "changed_by_email",
            "notes",
            "created_at",
        )
        read_only_fields = fields


class WorkOrderStatusChangeSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=WorkOrderStatus.choices)
    notes = serializers.CharField(required=False, allow_blank=True)
