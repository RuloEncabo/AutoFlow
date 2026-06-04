from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.clients.models import Client
from apps.core.models import AuditStampedModel
from apps.vehicles.models import Vehicle
from apps.work_orders.models import WorkOrder


class ReceptionStatus(models.TextChoices):
    DRAFT = "draft", "Borrador"
    IN_PROGRESS = "in_progress", "En recepcion"
    COMPLETED = "completed", "Completada"
    CANCELLED = "cancelled", "Cancelada"


class ReceptionSource(models.TextChoices):
    WEB = "web", "Web"
    APK = "apk", "APK"


class ChecklistStatus(models.TextChoices):
    OK = "ok", "Correcto"
    PROBLEM = "problem", "Con problema"
    NOT_CHECKED = "not_checked", "No revisado"


class InspectionResult(models.TextChoices):
    OK = "ok", "Correcto"
    FUTURE_ATTENTION = "future_attention", "Requiere atencion futura"
    IMMEDIATE_ATTENTION = "immediate_attention", "Requiere atencion inmediata"
    NOT_CHECKED = "not_checked", "No revisado"


class DamageSeverity(models.TextChoices):
    LOW = "low", "Leve"
    MEDIUM = "medium", "Media"
    HIGH = "high", "Alta"


class DamageAction(models.TextChoices):
    REPAIR = "repair", "Reparar"
    REPLACE = "replace", "Cambiar"
    OBSERVE = "observe", "Observar"


class DamageZone(models.TextChoices):
    FRONT = "front", "Frente"
    REAR = "rear", "Trasera"
    LEFT = "left", "Lateral izquierdo"
    RIGHT = "right", "Lateral derecho"
    ROOF = "roof", "Techo"
    INTERIOR = "interior", "Interior"
    ENGINE = "engine", "Motor"
    WHEELS = "wheels", "Ruedas"
    OTHER = "other", "Otro"


class VehicleReception(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reception_number = models.CharField(max_length=40, unique=True, blank=True)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="vehicle_receptions")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name="receptions")
    work_order = models.ForeignKey(
        WorkOrder,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="receptions",
    )
    received_at = models.DateTimeField(default=timezone.now, db_index=True)
    driver_name = models.CharField(max_length=180, blank=True)
    driver_phone = models.CharField(max_length=60, blank=True)
    driver_document = models.CharField(max_length=60, blank=True)
    odometer_km = models.PositiveIntegerField(null=True, blank=True)
    fuel_level = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=20, choices=ReceptionStatus.choices, default=ReceptionStatus.IN_PROGRESS, db_index=True)
    source = models.CharField(max_length=20, choices=ReceptionSource.choices, default=ReceptionSource.WEB, db_index=True)
    mobile_device_id = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-received_at"]
        indexes = [
            models.Index(fields=["vehicle", "status"]),
            models.Index(fields=["client", "received_at"]),
            models.Index(fields=["source", "received_at"]),
        ]

    def __str__(self):
        return self.reception_number or str(self.id)

    def save(self, *args, **kwargs):
        creating = not self.reception_number
        super().save(*args, **kwargs)
        if creating:
            self.reception_number = f"REC-{timezone.localdate():%Y%m%d}-{self.pk.hex[:6].upper()}"
            super().save(update_fields=["reception_number", "updated_at"])


class ReceptionChecklistItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reception = models.ForeignKey(VehicleReception, on_delete=models.CASCADE, related_name="checklist_items")
    section = models.CharField(max_length=120, default="Recepcion")
    code = models.CharField(max_length=80)
    label = models.CharField(max_length=180)
    status = models.CharField(max_length=20, choices=ChecklistStatus.choices, default=ChecklistStatus.OK, db_index=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["section", "label"]
        indexes = [models.Index(fields=["reception", "status"])]

    def __str__(self):
        return self.label


class ReceptionInspectionItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reception = models.ForeignKey(VehicleReception, on_delete=models.CASCADE, related_name="inspection_items")
    section = models.CharField(max_length=120)
    code = models.CharField(max_length=80)
    label = models.CharField(max_length=180)
    result = models.CharField(max_length=30, choices=InspectionResult.choices, default=InspectionResult.NOT_CHECKED, db_index=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["section", "label"]
        indexes = [models.Index(fields=["reception", "result"])]

    def __str__(self):
        return self.label


class ReceptionDamage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reception = models.ForeignKey(VehicleReception, on_delete=models.CASCADE, related_name="damages")
    zone = models.CharField(max_length=30, choices=DamageZone.choices, default=DamageZone.OTHER, db_index=True)
    part_name = models.CharField(max_length=180, blank=True)
    damage_type = models.CharField(max_length=120, blank=True)
    severity = models.CharField(max_length=20, choices=DamageSeverity.choices, default=DamageSeverity.MEDIUM, db_index=True)
    action_required = models.CharField(max_length=20, choices=DamageAction.choices, default=DamageAction.REPAIR, db_index=True)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to="reception/damages/", null=True, blank=True)
    source = models.CharField(max_length=20, choices=ReceptionSource.choices, default=ReceptionSource.WEB, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["reception", "zone"]),
            models.Index(fields=["action_required", "severity"]),
        ]

    def __str__(self):
        return f"{self.get_zone_display()} - {self.part_name or self.damage_type}"
