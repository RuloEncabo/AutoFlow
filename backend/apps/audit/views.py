from rest_framework import mixins, viewsets

from apps.core.permissions import IsAdminRole

from .filters import AuditLogFilter, SessionAuditFilter
from .models import AuditLog, SessionAudit
from .serializers import AuditLogSerializer, SessionAuditSerializer


class AuditLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminRole]
    filterset_class = AuditLogFilter
    search_fields = ("module", "action", "object_type", "object_id", "user__email", "session_key")
    ordering_fields = ("created_at", "module", "action", "user__email")
    ordering = ("-created_at",)

    def get_queryset(self):
        return AuditLog.objects.select_related("user")


class SessionAuditViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = SessionAuditSerializer
    permission_classes = [IsAdminRole]
    filterset_class = SessionAuditFilter
    search_fields = ("event", "user__email", "session_key", "user_agent")
    ordering_fields = ("created_at", "event", "user__email")
    ordering = ("-created_at",)

    def get_queryset(self):
        return SessionAudit.objects.select_related("user")
