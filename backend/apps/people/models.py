from __future__ import annotations

import uuid

from django.db import models
from django.db.models import Q

from apps.core.models import AuditStampedModel


class OperatorStatus(models.TextChoices):
    ACTIVE = "active", "Activo"
    INACTIVE = "inactive", "Inactivo"


class MaritalStatus(models.TextChoices):
    SINGLE = "single", "Soltero/a"
    MARRIED = "married", "Casado/a"
    DIVORCED = "divorced", "Divorciado/a"
    WIDOWED = "widowed", "Viudo/a"
    OTHER = "other", "Otro"


class OperatorTaskType(models.TextChoices):
    PAINTER = "painter", "Pintor"
    MECHANIC = "mechanic", "Mecanico"
    BODYWORKER = "bodyworker", "Chapista"


class Operator(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120)
    dni = models.CharField(max_length=40, db_index=True)
    address = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    marital_status = models.CharField(
        max_length=20,
        choices=MaritalStatus.choices,
        default=MaritalStatus.SINGLE,
    )
    task_type = models.CharField(max_length=20, choices=OperatorTaskType.choices, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=OperatorStatus.choices,
        default=OperatorStatus.ACTIVE,
        db_index=True,
    )

    class Meta:
        ordering = ["last_name", "first_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["dni"],
                condition=Q(deleted_at__isnull=True),
                name="uq_operator_dni_active",
            )
        ]
        indexes = [
            models.Index(fields=["last_name", "first_name"]),
            models.Index(fields=["task_type", "status"]),
            models.Index(fields=["status", "deleted_at"]),
        ]

    def __str__(self):
        return self.full_name

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
