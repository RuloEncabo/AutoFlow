from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from apps.clients.models import Client
from apps.core.models import AuditStampedModel
from apps.vehicles.models import Vehicle


class AppointmentStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Programado"
    CONFIRMED = "confirmed", "Confirmado"
    CANCELLED = "cancelled", "Cancelado"
    COMPLETED = "completed", "Completado"


class CommunicationChannel(models.TextChoices):
    EMAIL = "email", "Email"
    WHATSAPP = "whatsapp", "WhatsApp"


class CommunicationStatus(models.TextChoices):
    PENDING = "pending", "Pendiente"
    SENT = "sent", "Enviado"
    FAILED = "failed", "Fallido"


class Appointment(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="appointments")
    vehicle = models.ForeignKey(
        Vehicle,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="appointments",
    )
    scheduled_at = models.DateTimeField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.SCHEDULED,
        db_index=True,
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-scheduled_at"]
        indexes = [
            models.Index(fields=["scheduled_at", "status"]),
            models.Index(fields=["client", "scheduled_at"]),
            models.Index(fields=["vehicle", "scheduled_at"]),
            models.Index(fields=["status", "deleted_at"]),
        ]

    def __str__(self):
        return f"{self.client} - {self.scheduled_at:%Y-%m-%d %H:%M}"


class AppointmentCommunication(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="communications",
    )
    channel = models.CharField(max_length=20, choices=CommunicationChannel.choices)
    recipient = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=CommunicationStatus.choices,
        default=CommunicationStatus.PENDING,
        db_index=True,
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="appointment_communications",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["appointment", "created_at"]),
            models.Index(fields=["channel", "status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.appointment_id} {self.channel} {self.status}"

