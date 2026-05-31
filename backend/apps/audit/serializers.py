from rest_framework import serializers

from .models import AuditLog, SessionAudit


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    action_label = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "user",
            "user_email",
            "user_name",
            "module",
            "action",
            "action_label",
            "object_type",
            "object_id",
            "old_data",
            "new_data",
            "ip_address",
            "session_key",
            "created_at",
        )
        read_only_fields = fields


class SessionAuditSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    event_label = serializers.CharField(source="get_event_display", read_only=True)

    class Meta:
        model = SessionAudit
        fields = (
            "id",
            "user",
            "user_email",
            "user_name",
            "event",
            "event_label",
            "ip_address",
            "user_agent",
            "session_key",
            "metadata",
            "created_at",
        )
        read_only_fields = fields
