from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.core.permissions import IsWorkOrderRole
from apps.core.pdf import generate_reception_pdf, pdf_response
from apps.core.viewsets import AuditModelViewSet

from .models import ReceptionDamage, VehicleReception
from .serializers import ReceptionDamageSerializer, VehicleReceptionSerializer


class VehicleReceptionViewSet(AuditModelViewSet):
    audit_module = "vehicle_receptions"
    serializer_class = VehicleReceptionSerializer
    permission_classes = [IsWorkOrderRole]
    filterset_fields = ("client", "vehicle", "work_order", "status", "source")
    search_fields = (
        "reception_number",
        "client__first_name",
        "client__last_name",
        "vehicle__plate",
        "vehicle__brand",
        "vehicle__model",
        "driver_name",
        "notes",
    )
    ordering_fields = ("received_at", "status", "source", "created_at")
    ordering = ("-received_at",)

    def get_queryset(self):
        return VehicleReception.objects.select_related(
            "client",
            "vehicle",
            "work_order",
        ).prefetch_related(
            "checklist_items",
            "inspection_items",
            "damages",
        )

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        reception = self.get_object()
        reception.status = "completed"
        reception.updated_by = request.user
        reception.save(update_fields=["status", "updated_by", "updated_at"])
        return Response(self.get_serializer(reception).data)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        reception = self.get_object()
        return pdf_response(generate_reception_pdf(reception), f"recepcion_{reception.reception_number}")


class ReceptionDamageViewSet(AuditModelViewSet):
    audit_module = "reception_damages"
    serializer_class = ReceptionDamageSerializer
    permission_classes = [IsWorkOrderRole]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_fields = ("reception", "zone", "severity", "action_required", "source")
    search_fields = ("part_name", "damage_type", "description", "reception__reception_number", "reception__vehicle__plate")
    ordering_fields = ("created_at", "severity", "action_required")
    ordering = ("-created_at",)

    def get_queryset(self):
        return ReceptionDamage.objects.select_related("reception", "reception__vehicle", "created_by")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
