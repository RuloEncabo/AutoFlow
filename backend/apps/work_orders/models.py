from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.clients.models import Client
from apps.core.models import AuditStampedModel
from apps.vehicles.models import Vehicle


class WorkOrderStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Programado"
    RECEIVED = "received", "Recibido"
    ESTIMATING = "estimating", "Presupuestando"
    APPROVED = "approved", "Aprobado"
    WAITING_PARTS = "waiting_parts", "Esperando piezas"
    IN_REPAIR = "in_repair", "En reparacion"
    IN_PAINT = "in_paint", "En pintura"
    FINISHED = "finished", "Terminado"
    DELIVERED = "delivered", "Entregado"
    CLOSED = "closed", "Cerrada"
    CANCELLED = "cancelled", "Cancelado"


class Priority(models.TextChoices):
    LOW = "low", "Baja"
    NORMAL = "normal", "Normal"
    HIGH = "high", "Alta"
    URGENT = "urgent", "Urgente"


class TaskStatus(models.TextChoices):
    PENDING = "pending", "Pendiente"
    IN_PROGRESS = "in_progress", "En proceso"
    COMPLETED = "completed", "Completada"
    CANCELLED = "cancelled", "Cancelada"


class TaskTemplateStatus(models.TextChoices):
    ACTIVE = "active", "Activo"
    INACTIVE = "inactive", "Inactivo"


class TaskTemplate(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    estimated_minutes = models.PositiveIntegerField(default=0)
    labor_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=TaskTemplateStatus.choices,
        default=TaskTemplateStatus.ACTIVE,
        db_index=True,
    )

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["name"],
                condition=Q(deleted_at__isnull=True),
                name="uq_task_template_name_active",
            )
        ]
        indexes = [
            models.Index(fields=["status", "deleted_at"]),
            models.Index(fields=["name", "status"]),
        ]

    def __str__(self):
        return self.name


class WorkOrder(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=40, unique=True, blank=True)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="work_orders")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name="work_orders")
    appointment = models.ForeignKey(
        Appointment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="work_orders",
    )
    entry_date = models.DateTimeField(default=timezone.now, db_index=True)
    estimated_delivery_date = models.DateField(null=True, blank=True, db_index=True)
    actual_delivery_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL, db_index=True)
    description = models.TextField()
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=30,
        choices=WorkOrderStatus.choices,
        default=WorkOrderStatus.SCHEDULED,
        db_index=True,
    )

    class Meta:
        ordering = ["-entry_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["vehicle"],
                condition=Q(status__in=[
                    WorkOrderStatus.SCHEDULED,
                    WorkOrderStatus.RECEIVED,
                    WorkOrderStatus.ESTIMATING,
                    WorkOrderStatus.APPROVED,
                    WorkOrderStatus.WAITING_PARTS,
                    WorkOrderStatus.IN_REPAIR,
                    WorkOrderStatus.IN_PAINT,
                    WorkOrderStatus.FINISHED,
                ], deleted_at__isnull=True),
                name="uq_active_work_order_vehicle",
            )
        ]
        indexes = [
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["vehicle", "status"]),
            models.Index(fields=["estimated_delivery_date", "status"]),
            models.Index(fields=["client", "entry_date"]),
        ]

    def __str__(self):
        return self.order_number

    @property
    def tasks_total(self) -> int:
        return self.tasks.exclude(status=TaskStatus.CANCELLED).count()

    @property
    def tasks_completed(self) -> int:
        return self.tasks.filter(status=TaskStatus.COMPLETED).count()

    @property
    def tasks_pending(self) -> int:
        return self.tasks.exclude(status__in=[TaskStatus.COMPLETED, TaskStatus.CANCELLED]).count()

    @property
    def progress_percent(self) -> int:
        total = self.tasks_total
        if total == 0:
            return 0
        return round((self.tasks_completed / total) * 100)

    @property
    def labor_amount(self) -> Decimal:
        return sum(
            (task.labor_cost for task in self.tasks.exclude(status=TaskStatus.CANCELLED)),
            Decimal("0.00"),
        )

    @property
    def parts_amount(self) -> Decimal:
        return sum(
            (item.total_cost for item in self.parts.exclude(status="returned")),
            Decimal("0.00"),
        )

    @property
    def materials_amount(self) -> Decimal:
        return sum(
            (item.total_cost for item in self.materials.exclude(status="returned")),
            Decimal("0.00"),
        )

    @property
    def subtotal_amount(self) -> Decimal:
        return self.labor_amount + self.parts_amount + self.materials_amount


class WorkOrderTask(AuditStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name="tasks")
    task_template = models.ForeignKey(
        TaskTemplate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="work_order_tasks",
    )
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=TaskStatus.choices, default=TaskStatus.PENDING, db_index=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL, db_index=True)
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="work_order_tasks",
    )
    operator = models.ForeignKey(
        "people.Operator",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="work_order_tasks",
    )
    sector = models.CharField(max_length=80, blank=True, db_index=True)
    execution_order = models.PositiveIntegerField(default=1)
    estimated_minutes = models.PositiveIntegerField(default=0)
    labor_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estimated_date = models.DateField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["work_order", "execution_order", "created_at"]
        indexes = [
            models.Index(fields=["work_order", "execution_order"]),
            models.Index(fields=["status", "sector"]),
            models.Index(fields=["responsible", "status"]),
            models.Index(fields=["operator", "status"]),
            models.Index(fields=["task_template", "status"]),
        ]

    def __str__(self):
        return self.title


class WorkOrderStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name="status_history")
    old_status = models.CharField(max_length=30, blank=True)
    new_status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="work_order_status_changes",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["work_order", "created_at"]),
            models.Index(fields=["new_status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.work_order} {self.old_status}->{self.new_status}"
