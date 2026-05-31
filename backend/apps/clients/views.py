from django.db.models import Count
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsAuthenticatedAndAdminForDelete
from apps.core.viewsets import AuditModelViewSet

from .filters import ClientFilter
from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(AuditModelViewSet):
    audit_module = "clients"
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = ClientFilter
    search_fields = ("first_name", "last_name", "document", "phone", "email", "city")
    ordering_fields = ("last_name", "first_name", "created_at", "updated_at", "status")
    ordering = ("last_name", "first_name")

    def get_queryset(self):
        return Client.objects.annotate(vehicles_count=Count("vehicles", distinct=True))

    @action(detail=True, methods=["get"])
    def vehicles(self, request, pk=None):
        client = self.get_object()
        from apps.vehicles.serializers import VehicleSerializer

        queryset = client.vehicles.all().order_by("plate")
        return Response(VehicleSerializer(queryset, many=True).data)
