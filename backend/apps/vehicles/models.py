from __future__ import annotations

import uuid

from django.db import models
from django.db.models import Q

from apps.clients.models import Client
from apps.core.models import AuditStampedModel
from apps.core.utils import normalize_plate


class VehicleStatus(models.TextChoices):
    ACTIVE = "active", "Activo"
    INACTIVE = "inactive", "Inactivo"


class Vehicle(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="vehicles")
    brand = models.CharField(max_length=120)
    model = models.CharField(max_length=120)
    plate = models.CharField(max_length=30)
    plate_normalized = models.CharField(max_length=30, editable=False, db_index=True)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    color = models.CharField(max_length=80, blank=True)
    vin = models.CharField(max_length=80, blank=True, db_index=True)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=VehicleStatus.choices,
        default=VehicleStatus.ACTIVE,
        db_index=True,
    )

    class Meta:
        ordering = ["plate"]
        constraints = [
            models.UniqueConstraint(
                fields=["plate_normalized"],
                condition=Q(deleted_at__isnull=True),
                name="uq_vehicle_plate_active",
            )
        ]
        indexes = [
            models.Index(fields=["client", "status"]),
            models.Index(fields=["brand", "model"]),
            models.Index(fields=["status", "deleted_at"]),
        ]

    def __str__(self):
        return f"{self.plate} - {self.brand} {self.model}"

    def save(self, *args, **kwargs):
        self.plate = self.plate.strip().upper()
        self.plate_normalized = normalize_plate(self.plate)
        super().save(*args, **kwargs)

