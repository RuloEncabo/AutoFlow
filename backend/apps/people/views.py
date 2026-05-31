from apps.core.permissions import IsAuthenticatedAndAdminForDelete
from apps.core.viewsets import AuditModelViewSet

from .filters import OperatorFilter
from .models import Operator
from .serializers import OperatorSerializer


class OperatorViewSet(AuditModelViewSet):
    audit_module = "operators"
    serializer_class = OperatorSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = OperatorFilter
    search_fields = ("first_name", "last_name", "dni", "phone", "email", "address")
    ordering_fields = ("last_name", "first_name", "dni", "task_type", "status", "created_at")
    ordering = ("last_name", "first_name")

    def get_queryset(self):
        return Operator.objects.all()
