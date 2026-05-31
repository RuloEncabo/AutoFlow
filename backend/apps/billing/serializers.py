from rest_framework import serializers

from .models import Estimate, EstimateStatus, Invoice, MercadoPagoPayment, Payment, PaymentStatus


class EstimateSerializer(serializers.ModelSerializer):
    work_order_number = serializers.CharField(source="work_order.order_number", read_only=True)

    class Meta:
        model = Estimate
        fields = ("id", "work_order", "work_order_number", "labor_amount", "materials_amount", "parts_amount", "total_amount", "status", "approved_at", "created_at", "updated_at")
        read_only_fields = ("id", "work_order_number", "total_amount", "approved_at", "created_at", "updated_at")


class InvoiceSerializer(serializers.ModelSerializer):
    work_order_number = serializers.CharField(source="work_order.order_number", read_only=True)
    client_name = serializers.CharField(source="work_order.client.full_name", read_only=True)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.SerializerMethodField()
    mercadopago_status = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = ("id", "invoice_number", "work_order", "work_order_number", "client_name", "issued_at", "total", "payment_status", "paid_amount", "balance_due", "mercadopago_status", "notes", "created_at", "updated_at")
        read_only_fields = ("id", "invoice_number", "work_order_number", "client_name", "paid_amount", "balance_due", "mercadopago_status", "created_at", "updated_at")

    def get_balance_due(self, obj):
        balance = obj.total - obj.paid_amount
        return max(balance, 0)

    def get_mercadopago_status(self, obj):
        payment = obj.mercadopago_payments.first()
        if not payment:
            return ""
        return payment.status


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)

    class Meta:
        model = Payment
        fields = ("id", "invoice", "invoice_number", "amount", "method", "paid_at", "reference", "notes", "created_by", "created_at")
        read_only_fields = ("id", "invoice_number", "created_by", "created_at")


class EstimateStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[EstimateStatus.APPROVED, EstimateStatus.REJECTED])


class MercadoPagoPaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    client_name = serializers.CharField(source="invoice.work_order.client.full_name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = MercadoPagoPayment
        fields = (
            "id",
            "invoice",
            "invoice_number",
            "client_name",
            "preference_id",
            "payment_id",
            "merchant_order_id",
            "external_reference",
            "status",
            "status_label",
            "status_detail",
            "amount",
            "init_point",
            "sandbox_init_point",
            "paid_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class MercadoPagoPreferenceSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    preference_id = serializers.CharField()
    init_point = serializers.URLField(allow_blank=True)
    sandbox_init_point = serializers.URLField(allow_blank=True)
    status = serializers.CharField()
