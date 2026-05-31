from django.contrib import admin

from .models import AuditLog, SessionAudit


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "module", "action", "object_type", "object_id")
    list_filter = ("module", "action", "created_at")
    search_fields = ("module", "action", "object_type", "object_id", "user__email")
    readonly_fields = [field.name for field in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SessionAudit)
class SessionAuditAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "event", "ip_address")
    list_filter = ("event", "created_at")
    search_fields = ("user__email", "ip_address", "session_key")
    readonly_fields = [field.name for field in SessionAudit._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

