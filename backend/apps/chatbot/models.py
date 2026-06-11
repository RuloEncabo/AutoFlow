from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


DEFAULT_SYSTEM_PROMPT = (
    "Sos un asistente operativo de taller automotor. Ayudas al equipo a consultar y gestionar vehiculos, "
    "ordenes de trabajo, turnos, repuestos, materiales, facturacion e indicadores. Respondes siempre en "
    "espanol, de forma clara y directa. Antes de ejecutar cualquier accion que modifique datos, siempre "
    "pedis confirmacion al usuario. Si no tenes datos suficientes para responder, lo indicas claramente "
    "en lugar de inventar informacion. Cuando mostras listas, usas formato estructurado. Si el usuario "
    "parece confundido, ofreces acciones rapidas para guiarlo."
)


class ChatbotRole(models.TextChoices):
    USER = "user", "Usuario"
    ASSISTANT = "assistant", "Asistente"
    SYSTEM = "system", "Sistema"
    TOOL = "tool", "Tool"


class ChatbotInteraction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="chatbot_interactions",
    )
    session_id = models.CharField(max_length=120, db_index=True)
    role = models.CharField(max_length=20, choices=ChatbotRole.choices, db_index=True)
    content = models.TextField()
    tools_used = models.JSONField(default=list, blank=True)
    tokens_used = models.PositiveIntegerField(null=True, blank=True)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["session_id", "created_at"]),
            models.Index(fields=["role", "created_at"]),
        ]

    def __str__(self):
        return f"{self.session_id} {self.role} {self.created_at:%Y-%m-%d %H:%M:%S}"


class ChatbotConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    model_name = models.CharField(max_length=80, default="gpt-4o")
    system_prompt = models.TextField(default=DEFAULT_SYSTEM_PROMPT)
    max_tokens = models.PositiveIntegerField(default=900)
    temperature = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal("0.20"))
    enabled_tools = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="chatbot_config_updates",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["is_active"],
                condition=models.Q(is_active=True),
                name="uq_chatbot_single_active_config",
            )
        ]
        indexes = [
            models.Index(fields=["is_active", "updated_at"]),
        ]

    def __str__(self):
        return f"{self.model_name} ({'activo' if self.is_active else 'inactivo'})"
