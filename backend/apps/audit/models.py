from __future__ import annotations

from django.conf import settings
from django.db import models


class AuditAction(models.TextChoices):
    CREATE = "create", "Crear"
    UPDATE = "update", "Actualizar"
    DELETE = "delete", "Baja logica"
    RESTORE = "restore", "Restaurar"
    STATUS_CHANGE = "status_change", "Cambio de estado"
    LOGIN = "login", "Login"
    LOGOUT = "logout", "Logout"
    SEND_NOTIFICATION = "send_notification", "Enviar notificacion"


class SessionEvent(models.TextChoices):
    LOGIN = "login", "Login"
    LOGOUT = "logout", "Logout"
    REFRESH = "refresh", "Refresh"
    FAILED_LOGIN = "failed_login", "Login fallido"


class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    module = models.CharField(max_length=80, db_index=True)
    action = models.CharField(max_length=40, choices=AuditAction.choices, db_index=True)
    object_type = models.CharField(max_length=120, blank=True, db_index=True)
    object_id = models.CharField(max_length=80, blank=True, db_index=True)
    old_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    session_key = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["module", "created_at"]),
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M:%S} {self.module}.{self.action}"


class SessionAudit(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="session_audits",
    )
    event = models.CharField(max_length=40, choices=SessionEvent.choices, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=120, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M:%S} {self.event}"

