from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import AuditStampedModel
from apps.work_orders.models import WorkOrder


class EstimateStatus(models.TextChoices):
    PENDING = "pending", "Pendiente"
    APPROVED = "approved", "Aprobado"
    REJECTED = "rejected", "Rechazado"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pendiente"
    PARTIAL = "partial", "Parcial"
    PAID = "paid", "Pagado"
    CANCELLED = "cancelled", "Cancelado"


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Efectivo"
    TRANSFER = "transfer", "Transferencia"
    CARD = "card", "Tarjeta"
    OTHER = "other", "Otro"


class MercadoPagoPaymentStatus(models.TextChoices):
    CREATED = "created", "Creado"
    PENDING = "pending", "Pendiente"
    AUTHORIZED = "authorized", "Autorizado"
    IN_PROCESS = "in_process", "En proceso"
    IN_MEDIATION = "in_mediation", "En mediacion"
    APPROVED = "approved", "Aprobado"
    REJECTED = "rejected", "Rechazado"
    CANCELLED = "cancelled", "Cancelado"
    REFUNDED = "refunded", "Devuelto"
    CHARGED_BACK = "charged_back", "Contracargo"
    UNKNOWN = "unknown", "Desconocido"


class Estimate(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name="estimates")
    labor_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    materials_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    parts_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=EstimateStatus.choices, default=EstimateStatus.PENDING, db_index=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["work_order", "status"])]

    def save(self, *args, **kwargs):
        self.total_amount = (self.labor_amount or 0) + (self.materials_amount or 0) + (self.parts_amount or 0)
        if self.status == EstimateStatus.APPROVED and not self.approved_at:
            self.approved_at = timezone.now()
        super().save(*args, **kwargs)


class Invoice(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=40, unique=True, blank=True)
    work_order = models.ForeignKey(WorkOrder, on_delete=models.PROTECT, related_name="invoices")
    issued_at = models.DateTimeField(default=timezone.now, db_index=True)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING, db_index=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-issued_at"]
        indexes = [
            models.Index(fields=["work_order", "payment_status"]),
            models.Index(fields=["issued_at", "payment_status"]),
        ]

    def __str__(self):
        return self.invoice_number

    @property
    def paid_amount(self):
        return sum((payment.amount for payment in self.payments.all()), Decimal("0.00"))


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    paid_at = models.DateTimeField(default=timezone.now, db_index=True)
    reference = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-paid_at"]
        indexes = [models.Index(fields=["invoice", "paid_at"])]


class MercadoPagoPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="mercadopago_payments")
    preference_id = models.CharField(max_length=120, blank=True, db_index=True)
    payment_id = models.CharField(max_length=120, blank=True, db_index=True)
    merchant_order_id = models.CharField(max_length=120, blank=True, db_index=True)
    external_reference = models.CharField(max_length=120, blank=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=MercadoPagoPaymentStatus.choices,
        default=MercadoPagoPaymentStatus.CREATED,
        db_index=True,
    )
    status_detail = models.CharField(max_length=120, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    init_point = models.URLField(blank=True, max_length=500)
    sandbox_init_point = models.URLField(blank=True, max_length=500)
    raw_preference = models.JSONField(null=True, blank=True)
    raw_payment = models.JSONField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["preference_id"],
                condition=models.Q(preference_id__gt=""),
                name="uq_mp_preference_id",
            ),
            models.UniqueConstraint(
                fields=["payment_id"],
                condition=models.Q(payment_id__gt=""),
                name="uq_mp_payment_id",
            ),
        ]
        indexes = [
            models.Index(fields=["invoice", "status"]),
            models.Index(fields=["external_reference", "status"]),
            models.Index(fields=["payment_id", "status"]),
        ]

    def __str__(self):
        return f"{self.invoice.invoice_number} MP {self.status}"
