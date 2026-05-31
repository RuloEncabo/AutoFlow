import django_filters

from .models import AuditLog, SessionAudit


class AuditLogFilter(django_filters.FilterSet):
    created_at_after = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_at_before = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = AuditLog
        fields = {
            "user": ["exact"],
            "module": ["exact", "icontains"],
            "action": ["exact"],
            "object_type": ["exact", "icontains"],
            "object_id": ["exact"],
            "ip_address": ["exact"],
        }


class SessionAuditFilter(django_filters.FilterSet):
    created_at_after = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_at_before = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = SessionAudit
        fields = {
            "user": ["exact"],
            "event": ["exact"],
            "ip_address": ["exact"],
        }
