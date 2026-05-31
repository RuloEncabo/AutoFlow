from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.core.models import AuditStampedModel
from apps.work_orders.models import WorkOrder


class InventoryStatus(models.TextChoices):
    ACTIVE = "active", "Activo"
    INACTIVE = "inactive", "Inactivo"


class ConsumptionStatus(models.TextChoices):
    RESERVED = "reserved", "Reservado"
    USED = "used", "Usado"
    RETURNED = "returned", "Devuelto"


class MovementType(models.TextChoices):
    IN = "in", "Ingreso"
    OUT = "out", "Salida"
    ADJUSTMENT = "adjustment", "Ajuste"
    RETURN = "return", "Devolucion"


class InventoryFamily(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=InventoryStatus.choices, default=InventoryStatus.ACTIVE, db_index=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["name"], condition=Q(deleted_at__isnull=True), name="uq_inventory_family_name_active")
        ]
        indexes = [
            models.Index(fields=["status", "deleted_at"]),
            models.Index(fields=["name", "status"]),
        ]

    def __str__(self):
        return self.name


class Part(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    family = models.ForeignKey(
        InventoryFamily,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="parts",
    )
    code = models.CharField(max_length=80)
    supplier_code = models.CharField(max_length=120, blank=True, db_index=True)
    barcode = models.CharField(max_length=120, blank=True, db_index=True)
    qr_code = models.CharField(max_length=255, blank=True, db_index=True)
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    min_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=InventoryStatus.choices, default=InventoryStatus.ACTIVE, db_index=True)

    class Meta:
        ordering = ["code"]
        constraints = [
            models.UniqueConstraint(fields=["code"], condition=Q(deleted_at__isnull=True), name="uq_part_code_active"),
            models.UniqueConstraint(fields=["barcode"], condition=Q(barcode__gt="", deleted_at__isnull=True), name="uq_part_barcode_active"),
            models.UniqueConstraint(fields=["qr_code"], condition=Q(qr_code__gt="", deleted_at__isnull=True), name="uq_part_qr_code_active"),
        ]
        indexes = [
            models.Index(fields=["status", "deleted_at"]),
            models.Index(fields=["stock", "min_stock"]),
            models.Index(fields=["family", "status"]),
            models.Index(fields=["supplier_code", "status"]),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Material(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    family = models.ForeignKey(
        InventoryFamily,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="materials",
    )
    code = models.CharField(max_length=80)
    supplier_code = models.CharField(max_length=120, blank=True, db_index=True)
    barcode = models.CharField(max_length=120, blank=True, db_index=True)
    qr_code = models.CharField(max_length=255, blank=True, db_index=True)
    name = models.CharField(max_length=180)
    type = models.CharField(max_length=80, blank=True, db_index=True)
    description = models.TextField(blank=True)
    stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    min_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=InventoryStatus.choices, default=InventoryStatus.ACTIVE, db_index=True)

    class Meta:
        ordering = ["code"]
        constraints = [
            models.UniqueConstraint(fields=["code"], condition=Q(deleted_at__isnull=True), name="uq_material_code_active"),
            models.UniqueConstraint(fields=["barcode"], condition=Q(barcode__gt="", deleted_at__isnull=True), name="uq_material_barcode_active"),
            models.UniqueConstraint(fields=["qr_code"], condition=Q(qr_code__gt="", deleted_at__isnull=True), name="uq_material_qr_code_active"),
        ]
        indexes = [
            models.Index(fields=["status", "deleted_at"]),
            models.Index(fields=["stock", "min_stock"]),
            models.Index(fields=["family", "status"]),
            models.Index(fields=["supplier_code", "status"]),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class WorkOrderPart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name="parts")
    part = models.ForeignKey(Part, on_delete=models.PROTECT, related_name="work_order_usages")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=ConsumptionStatus.choices, default=ConsumptionStatus.RESERVED, db_index=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["work_order", "created_at"])]

    def save(self, *args, **kwargs):
        if not self.unit_cost:
            self.unit_cost = self.part.cost
        self.total_cost = (self.quantity or Decimal("0")) * (self.unit_cost or Decimal("0"))
        super().save(*args, **kwargs)


class WorkOrderMaterial(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name="materials")
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name="work_order_usages")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=ConsumptionStatus.choices, default=ConsumptionStatus.RESERVED, db_index=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["work_order", "created_at"])]

    def save(self, *args, **kwargs):
        if not self.unit_cost:
            self.unit_cost = self.material.cost
        self.total_cost = (self.quantity or Decimal("0")) * (self.unit_cost or Decimal("0"))
        super().save(*args, **kwargs)


class StockMovement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_type = models.CharField(max_length=20)
    part = models.ForeignKey(Part, null=True, blank=True, on_delete=models.CASCADE, related_name="stock_movements")
    material = models.ForeignKey(Material, null=True, blank=True, on_delete=models.CASCADE, related_name="stock_movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=255, blank=True)
    work_order = models.ForeignKey(WorkOrder, null=True, blank=True, on_delete=models.SET_NULL, related_name="stock_movements")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["item_type", "created_at"])]
