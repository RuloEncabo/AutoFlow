from django.utils import timezone
from rest_framework import serializers

from apps.vehicles.models import Vehicle

from .models import Appointment, AppointmentCommunication, AppointmentStatus


class AppointmentCommunicationSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source="created_by.email", read_only=True)

    class Meta:
        model = AppointmentCommunication
        fields = (
            "id",
            "appointment",
            "channel",
            "recipient",
            "message",
            "status",
            "sent_at",
            "error_message",
            "created_by",
            "created_by_email",
            "created_at",
        )
        read_only_fields = fields


class AppointmentSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    vehicle_label = serializers.SerializerMethodField()
    communications_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "client",
            "client_name",
            "vehicle",
            "vehicle_label",
            "scheduled_at",
            "status",
            "notes",
            "communications_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "client_name",
            "vehicle_label",
            "communications_count",
            "created_at",
            "updated_at",
        )

    def get_vehicle_label(self, obj):
        if not obj.vehicle:
            return ""
        return f"{obj.vehicle.plate} - {obj.vehicle.brand} {obj.vehicle.model}"

    def validate(self, attrs):
        client = attrs.get("client", getattr(self.instance, "client", None))
        vehicle = attrs.get("vehicle", getattr(self.instance, "vehicle", None))
        scheduled_at = attrs.get("scheduled_at", getattr(self.instance, "scheduled_at", None))
        status = attrs.get("status", getattr(self.instance, "status", AppointmentStatus.SCHEDULED))

        if vehicle and client and vehicle.client_id != client.id:
            raise serializers.ValidationError({"vehicle": "El vehiculo no pertenece al cliente seleccionado."})

        if scheduled_at and timezone.is_naive(scheduled_at):
            scheduled_at = timezone.make_aware(scheduled_at, timezone.get_current_timezone())
            attrs["scheduled_at"] = scheduled_at

        if scheduled_at and status != AppointmentStatus.CANCELLED:
            conflicts = Appointment.objects.filter(
                scheduled_at=scheduled_at,
                deleted_at__isnull=True,
            ).exclude(status=AppointmentStatus.CANCELLED)
            if vehicle:
                conflicts = conflicts.filter(vehicle=vehicle)
            else:
                conflicts = conflicts.filter(client=client, vehicle__isnull=True)
            if self.instance:
                conflicts = conflicts.exclude(pk=self.instance.pk)
            if conflicts.exists():
                raise serializers.ValidationError(
                    {"scheduled_at": "Ya existe un turno activo para ese horario."}
                )

        return attrs


class AppointmentNotificationSerializer(serializers.Serializer):
    channels = serializers.ListField(
        child=serializers.ChoiceField(choices=["email", "whatsapp"]),
        required=False,
        allow_empty=False,
    )


class AppointmentAvailabilitySerializer(serializers.Serializer):
    scheduled_at = serializers.DateTimeField()
    vehicle = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        required=False,
        allow_null=True,
    )

