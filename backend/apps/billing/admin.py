from django.contrib import admin

from .models import Estimate, Invoice, MercadoPagoPayment, Payment


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display = ("work_order", "labor_amount", "materials_amount", "parts_amount", "extra_amount", "total_amount", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("work_order__order_number",)
    readonly_fields = ("created_at", "updated_at", "deleted_at")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "work_order", "subtotal", "discount_percent", "tax_percent", "total", "payment_status", "issued_at")
    list_filter = ("payment_status", "issued_at", "created_at")
    search_fields = ("invoice_number", "work_order__order_number", "work_order__client__last_name")
    readonly_fields = ("created_at", "updated_at", "deleted_at")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "amount", "method", "paid_at", "created_by")
    list_filter = ("method", "paid_at", "created_at")
    search_fields = ("invoice__invoice_number", "reference", "notes")


@admin.register(MercadoPagoPayment)
class MercadoPagoPaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "status", "amount", "payment_id", "preference_id", "paid_at", "created_at")
    list_filter = ("status", "created_at", "paid_at")
    search_fields = ("invoice__invoice_number", "payment_id", "preference_id", "external_reference")
    readonly_fields = ("raw_preference", "raw_payment", "created_at", "updated_at")
