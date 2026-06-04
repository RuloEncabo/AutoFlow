from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return super().update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def deleted(self):
        return self.filter(deleted_at__isnull=False)


class SoftDeleteManager(models.Manager.from_queryset(SoftDeleteQuerySet)):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class SoftDeleteModel(TimeStampedModel):
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])

    def hard_delete(self, using=None, keep_parents=False):
        return super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        self.deleted_at = None
        self.save(update_fields=["deleted_at", "updated_at"])


class AuditStampedModel(SoftDeleteModel):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_updated",
    )

    class Meta:
        abstract = True


class WorkshopProfile(TimeStampedModel):
    name = models.CharField(max_length=180, default="AutoFlow Taller")
    address = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=60, blank=True)
    whatsapp = models.CharField(max_length=60, blank=True)
    email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to="workshop/", null=True, blank=True)
    order_header_title = models.CharField(max_length=120, default="Orden de trabajo")
    estimate_header_title = models.CharField(max_length=120, default="Presupuesto")
    invoice_header_title = models.CharField(max_length=120, default="Factura")
    document_footer = models.TextField(blank=True)
    email_service_enabled = models.BooleanField(default=True)
    email_from_name = models.CharField(max_length=180, blank=True)
    email_from_address = models.EmailField(blank=True)
    smtp_host = models.CharField(max_length=180, blank=True)
    smtp_port = models.PositiveIntegerField(default=587)
    smtp_username = models.CharField(max_length=180, blank=True)
    smtp_password = models.CharField(max_length=255, blank=True)
    smtp_use_tls = models.BooleanField(default=True)
    smtp_use_ssl = models.BooleanField(default=False)
    password_reset_enabled = models.BooleanField(default=True)
    password_reset_token_minutes = models.PositiveIntegerField(default=60)
    password_reset_frontend_url = models.URLField(blank=True, max_length=500)
    mobile_api_enabled = models.BooleanField(default=True)
    mobile_default_api_url = models.URLField(blank=True, max_length=500)
    mobile_photo_upload_enabled = models.BooleanField(default=True)
    mobile_require_damage_photo = models.BooleanField(default=False)
    mobile_max_photo_mb = models.PositiveIntegerField(default=8)
    mobile_offline_sync_enabled = models.BooleanField(default=True)

    class Meta:
        verbose_name = "perfil del taller"
        verbose_name_plural = "perfil del taller"

    def __str__(self):
        return self.name
