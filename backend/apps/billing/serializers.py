from decimal import Decimal

from rest_framework import serializers

from .models import Estimate, EstimateStatus, Invoice, MercadoPagoPayment, Payment, PaymentStatus


class EstimateSerializer(serializers.ModelSerializer):
    work_order_number = serializers.CharField(source="work_order.order_number", read_only=True)

    class Meta:
        model = Estimate
        fields = (
            "id",
            "work_order",
            "work_order_number",
            "labor_amount",
            "materials_amount",
            "parts_amount",
            "extra_description",
            "extra_amount",
            "total_amount",
            "status",
            "approved_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "work_order_number",
            "labor_amount",
            "materials_amount",
            "parts_amount",
            "total_amount",
            "approved_at",
            "created_at",
            "updated_at",
        )

    def validate_extra_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("El item adicional no puede ser negativo.")
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    work_order_number = serializers.CharField(source="work_order.order_number", read_only=True)
    client_name = serializers.CharField(source="work_order.client.full_name", read_only=True)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.SerializerMethodField()
    mercadopago_status = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = (
            "id",
            "invoice_number",
            "work_order",
            "work_order_number",
            "client_name",
            "estimate",
            "issued_at",
            "labor_amount",
            "materials_amount",
            "parts_amount",
            "extra_description",
            "extra_amount",
            "subtotal",
            "discount_percent",
            "discount_amount",
            "taxable_amount",
            "tax_percent",
            "tax_amount",
            "total",
            "payment_status",
            "paid_amount",
            "balance_due",
            "mercadopago_status",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "invoice_number",
            "work_order_number",
            "client_name",
            "labor_amount",
            "materials_amount",
            "parts_amount",
            "subtotal",
            "discount_amount",
            "taxable_amount",
            "tax_amount",
            "total",
            "paid_amount",
            "balance_due",
            "mercadopago_status",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {"work_order": {"required": False}}

    def get_balance_due(self, obj):
        balance = obj.total - obj.paid_amount
        return max(balance, 0)

    def get_mercadopago_status(self, obj):
        payment = obj.mercadopago_payments.first()
        if not payment:
            return ""
        return payment.status

    def validate(self, attrs):
        estimate = attrs.get("estimate", getattr(self.instance, "estimate", None))
        work_order = attrs.get("work_order", getattr(self.instance, "work_order", None))
        if estimate and not work_order:
            attrs["work_order"] = estimate.work_order
            work_order = estimate.work_order
        if estimate and work_order and estimate.work_order_id != work_order.id:
            raise serializers.ValidationError({"estimate": "El presupuesto no pertenece a la orden seleccionada."})

        tax_percent = attrs.get("tax_percent", getattr(self.instance, "tax_percent", Decimal("21.00")))
        if Decimal(str(tax_percent)) not in {Decimal("10.50"), Decimal("21.00")}:
            raise serializers.ValidationError({"tax_percent": "El IVA debe ser 21% o 10,5%."})

        discount_percent = attrs.get("discount_percent", getattr(self.instance, "discount_percent", Decimal("0.00")))
        if discount_percent < 0 or discount_percent > 100:
            raise serializers.ValidationError({"discount_percent": "El descuento debe estar entre 0 y 100%."})

        extra_amount = attrs.get("extra_amount", getattr(self.instance, "extra_amount", Decimal("0.00")))
        if extra_amount < 0:
            raise serializers.ValidationError({"extra_amount": "El item adicional no puede ser negativo."})
        return attrs


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
