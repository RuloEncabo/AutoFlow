from decimal import Decimal

from rest_framework import serializers

from apps.billing.models import Invoice, PaymentStatus

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    vehicles_count = serializers.IntegerField(read_only=True)
    billing_summary = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = (
            "id",
            "first_name",
            "last_name",
            "full_name",
            "document",
            "phone",
            "email",
            "address",
            "city",
            "notes",
            "status",
            "vehicles_count",
            "billing_summary",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "full_name", "vehicles_count", "billing_summary", "created_at", "updated_at")

    def get_billing_summary(self, obj):
        invoices = Invoice.objects.filter(work_order__client=obj).prefetch_related("payments")
        paid_count = 0
        due_count = 0
        paid_total = 0
        due_total = 0
        for invoice in invoices:
            paid_amount = invoice.paid_amount
            if invoice.payment_status == PaymentStatus.PAID:
                paid_count += 1
                paid_total += invoice.total
            elif invoice.payment_status != PaymentStatus.CANCELLED:
                due_count += 1
                due_total += max(invoice.total - paid_amount, Decimal("0.00"))
        return {
            "paid_count": paid_count,
            "due_count": due_count,
            "paid_total": str(paid_total),
            "due_total": str(due_total),
        }

    def validate(self, attrs):
        first_name = attrs.get("first_name", getattr(self.instance, "first_name", "")).strip()
        last_name = attrs.get("last_name", getattr(self.instance, "last_name", "")).strip()
        phone = attrs.get("phone", getattr(self.instance, "phone", "")).strip()

        if not first_name:
            raise serializers.ValidationError({"first_name": "El nombre es obligatorio."})
        if not last_name:
            raise serializers.ValidationError({"last_name": "El apellido es obligatorio."})
        if not phone:
            raise serializers.ValidationError({"phone": "El telefono es obligatorio."})

        return attrs
