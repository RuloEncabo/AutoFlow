from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import create_audit_log
from apps.core.permissions import IsAuthenticatedAndAdminForDelete
from apps.core.viewsets import AuditModelViewSet, snapshot_instance

from .filters import AppointmentFilter
from .models import Appointment, AppointmentStatus
from .serializers import (
    AppointmentAvailabilitySerializer,
    AppointmentCommunicationSerializer,
    AppointmentNotificationSerializer,
    AppointmentSerializer,
)
from .services import send_email_notification, send_whatsapp_notification


class AppointmentViewSet(AuditModelViewSet):
    audit_module = "appointments"
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = AppointmentFilter
    search_fields = (
        "client__first_name",
        "client__last_name",
        "client__document",
        "vehicle__plate",
        "vehicle__plate_normalized",
        "vehicle__brand",
        "vehicle__model",
        "notes",
    )
    ordering_fields = ("scheduled_at", "status", "created_at", "updated_at")
    ordering = ("-scheduled_at",)

    def get_queryset(self):
        return (
            Appointment.objects.select_related("client", "vehicle")
            .annotate(communications_count=Count("communications"))
        )

    @action(detail=False, methods=["get"])
    def availability(self, request):
        serializer = AppointmentAvailabilitySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        scheduled_at = serializer.validated_data["scheduled_at"]
        vehicle = serializer.validated_data.get("vehicle")

        queryset = Appointment.objects.filter(
            scheduled_at=scheduled_at,
            deleted_at__isnull=True,
        ).exclude(status=AppointmentStatus.CANCELLED)
        if vehicle:
            queryset = queryset.filter(vehicle=vehicle)

        conflicts = queryset.count()
        return Response({"available": conflicts == 0, "conflicts": conflicts})

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        appointment = self.get_object()
        old_data = snapshot_instance(appointment)
        appointment.status = AppointmentStatus.CONFIRMED
        appointment.updated_by = request.user
        appointment.save(update_fields=["status", "updated_by", "updated_at"])
        create_audit_log(
            request=request,
            module=self.audit_module,
            action=AuditAction.STATUS_CHANGE,
            object_type="Appointment",
            object_id=appointment.pk,
            old_data=old_data,
            new_data=snapshot_instance(appointment),
        )
        return Response(self.get_serializer(appointment).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        old_data = snapshot_instance(appointment)
        appointment.status = AppointmentStatus.CANCELLED
        appointment.updated_by = request.user
        appointment.save(update_fields=["status", "updated_by", "updated_at"])
        create_audit_log(
            request=request,
            module=self.audit_module,
            action=AuditAction.STATUS_CHANGE,
            object_type="Appointment",
            object_id=appointment.pk,
            old_data=old_data,
            new_data=snapshot_instance(appointment),
        )
        return Response(self.get_serializer(appointment).data)

    @action(detail=True, methods=["post"], url_path="send-email")
    def send_email(self, request, pk=None):
        communication = send_email_notification(
            appointment=self.get_object(),
            request=request,
        )
        return Response(AppointmentCommunicationSerializer(communication).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="send-whatsapp")
    def send_whatsapp(self, request, pk=None):
        communication = send_whatsapp_notification(
            appointment=self.get_object(),
            request=request,
        )
        return Response(AppointmentCommunicationSerializer(communication).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="send-notification")
    def send_notification(self, request, pk=None):
        serializer = AppointmentNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        channels = serializer.validated_data.get("channels") or ["email", "whatsapp"]

        appointment = self.get_object()
        communications = []
        if "email" in channels:
            communications.append(send_email_notification(appointment=appointment, request=request))
        if "whatsapp" in channels:
            communications.append(send_whatsapp_notification(appointment=appointment, request=request))

        return Response(
            AppointmentCommunicationSerializer(communications, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def communications(self, request, pk=None):
        appointment = self.get_object()
        queryset = appointment.communications.select_related("created_by").all()
        return Response(AppointmentCommunicationSerializer(queryset, many=True).data)

