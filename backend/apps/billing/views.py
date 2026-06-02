from django.db.models import Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditAction
from apps.audit.services import create_audit_log
from apps.core.permissions import IsAuthenticatedAndAdminForDelete
from apps.core.pdf import generate_estimate_pdf, generate_invoice_pdf, pdf_response
from apps.core.viewsets import AuditModelViewSet, snapshot_instance

from .filters import EstimateFilter, InvoiceFilter, PaymentFilter
from .mercadopago import create_preference, get_payment, register_payment_from_mercadopago, verify_webhook_signature
from .models import Estimate, EstimateStatus, Invoice, MercadoPagoPayment, Payment, PaymentStatus
from .serializers import (
    EstimateSerializer,
    EstimateStatusSerializer,
    InvoiceSerializer,
    MercadoPagoPaymentSerializer,
    MercadoPagoPreferenceSerializer,
    PaymentSerializer,
)
from .services import generate_invoice_number


class EstimateViewSet(AuditModelViewSet):
    audit_module = "billing_estimates"
    serializer_class = EstimateSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = EstimateFilter
    search_fields = ("work_order__order_number", "work_order__client__first_name", "work_order__client__last_name")
    ordering_fields = ("created_at", "total_amount", "status")
    ordering = ("-created_at",)

    def get_queryset(self):
        return Estimate.objects.select_related("work_order", "work_order__client", "work_order__vehicle")

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        estimate = self.get_object()
        old_data = snapshot_instance(estimate)
        estimate.status = EstimateStatus.APPROVED
        estimate.updated_by = request.user
        estimate.save()
        create_audit_log(request=request, module=self.audit_module, action=AuditAction.STATUS_CHANGE, object_type="Estimate", object_id=estimate.pk, old_data=old_data, new_data=snapshot_instance(estimate))
        return Response(self.get_serializer(estimate).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        estimate = self.get_object()
        old_data = snapshot_instance(estimate)
        estimate.status = EstimateStatus.REJECTED
        estimate.updated_by = request.user
        estimate.save()
        create_audit_log(request=request, module=self.audit_module, action=AuditAction.STATUS_CHANGE, object_type="Estimate", object_id=estimate.pk, old_data=old_data, new_data=snapshot_instance(estimate))
        return Response(self.get_serializer(estimate).data)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        estimate = self.get_object()
        return pdf_response(generate_estimate_pdf(estimate), f"presupuesto_{estimate.work_order.order_number}")


class InvoiceViewSet(AuditModelViewSet):
    audit_module = "billing_invoices"
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = InvoiceFilter
    search_fields = ("invoice_number", "work_order__order_number", "work_order__client__first_name", "work_order__client__last_name")
    ordering_fields = ("issued_at", "total", "payment_status")
    ordering = ("-issued_at",)

    def get_queryset(self):
        return Invoice.objects.select_related(
            "estimate",
            "work_order",
            "work_order__client",
            "work_order__vehicle",
        ).prefetch_related("payments", "mercadopago_payments")

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        if not instance.invoice_number:
            instance.invoice_number = generate_invoice_number()
            instance.save(update_fields=["invoice_number"])
        create_audit_log(request=self.request, module=self.audit_module, action=AuditAction.CREATE, object_type="Invoice", object_id=instance.pk, new_data=snapshot_instance(instance))

    @action(detail=True, methods=["get"])
    def payments(self, request, pk=None):
        invoice = self.get_object()
        return Response(PaymentSerializer(invoice.payments.all(), many=True).data)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        return pdf_response(generate_invoice_pdf(invoice), f"factura_{invoice.invoice_number}")

    @action(detail=True, methods=["post"], url_path="mercadopago/create-preference")
    def create_mercadopago_preference(self, request, pk=None):
        record = create_preference(invoice=self.get_object(), request=request, user=request.user)
        payload = {
            "id": record.id,
            "preference_id": record.preference_id,
            "init_point": record.init_point,
            "sandbox_init_point": record.sandbox_init_point,
            "status": record.status,
        }
        return Response(MercadoPagoPreferenceSerializer(payload).data, status=status.HTTP_201_CREATED)


class PaymentViewSet(AuditModelViewSet):
    audit_module = "billing_payments"
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = PaymentFilter
    search_fields = ("invoice__invoice_number", "reference", "notes")
    ordering_fields = ("paid_at", "amount", "method")
    ordering = ("-paid_at",)

    def get_queryset(self):
        return Payment.objects.select_related("invoice")

    def perform_create(self, serializer):
        payment = serializer.save(created_by=self.request.user)
        invoice = payment.invoice
        paid = invoice.payments.aggregate(total=Sum("amount"))["total"] or 0
        old_status = invoice.payment_status
        if paid <= 0:
            invoice.payment_status = PaymentStatus.PENDING
        elif paid < invoice.total:
            invoice.payment_status = PaymentStatus.PARTIAL
        else:
            invoice.payment_status = PaymentStatus.PAID
        if invoice.payment_status != old_status:
            invoice.save(update_fields=["payment_status", "updated_at"])
        create_audit_log(request=self.request, module=self.audit_module, action=AuditAction.CREATE, object_type="Payment", object_id=payment.pk, new_data={"invoice": str(invoice.pk), "amount": str(payment.amount), "payment_status": invoice.payment_status})


class MercadoPagoPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MercadoPagoPaymentSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    search_fields = ("invoice__invoice_number", "payment_id", "preference_id", "external_reference")
    ordering_fields = ("created_at", "updated_at", "paid_at", "status", "amount")
    ordering = ("-created_at",)

    def get_queryset(self):
        return MercadoPagoPayment.objects.select_related("invoice", "invoice__work_order", "invoice__work_order__client")


class MercadoPagoWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def _payment_id(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        return (
            request.query_params.get("data.id")
            or request.query_params.get("id")
            or data.get("data", {}).get("id")
            or data.get("id")
        )

    def _topic(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        return request.query_params.get("type") or request.query_params.get("topic") or data.get("type") or data.get("topic")

    def post(self, request):
        payment_id = str(self._payment_id(request) or "")
        topic = str(self._topic(request) or "")
        if topic and topic not in {"payment", "payments"}:
            return Response({"status": "ignored", "topic": topic})
        if not payment_id:
            return Response({"status": "ignored", "detail": "Sin id de pago."})
        if not verify_webhook_signature(request, payment_id):
            return Response({"detail": "Firma Mercado Pago invalida."}, status=status.HTTP_401_UNAUTHORIZED)

        payment_data = get_payment(payment_id)
        record = register_payment_from_mercadopago(payment_data, request=request)
        return Response({"status": "processed", "invoice": str(record.invoice_id), "payment_status": record.status})
