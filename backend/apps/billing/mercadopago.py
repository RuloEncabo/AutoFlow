from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import create_audit_log

from .models import Invoice, MercadoPagoPayment, MercadoPagoPaymentStatus, Payment, PaymentMethod, PaymentStatus

MERCADOPAGO_API_BASE = "https://api.mercadopago.com"


class MercadoPagoAPIError(APIException):
    status_code = 502
    default_detail = "No se pudo comunicar con Mercado Pago."
    default_code = "mercadopago_error"


def _access_token():
    token = settings.MERCADOPAGO_ACCESS_TOKEN.strip()
    if not token:
        raise ValidationError({"mercadopago": "Configure MERCADOPAGO_ACCESS_TOKEN para cobrar con Mercado Pago."})
    return token


def _api_request(method: str, path: str, payload=None, idempotency_key: str | None = None):
    headers = {
        "Authorization": f"Bearer {_access_token()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if idempotency_key:
        headers["X-Idempotency-Key"] = idempotency_key

    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(f"{MERCADOPAGO_API_BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=25) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise MercadoPagoAPIError(f"Mercado Pago HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise MercadoPagoAPIError(str(exc)) from exc


def _notification_url(request):
    if settings.MERCADOPAGO_NOTIFICATION_URL:
        return settings.MERCADOPAGO_NOTIFICATION_URL
    if settings.BACKEND_PUBLIC_URL:
        return f"{settings.BACKEND_PUBLIC_URL.rstrip('/')}{reverse('billing:mercadopago-webhook')}"
    return request.build_absolute_uri(reverse("billing:mercadopago-webhook"))


def _frontend_url(path):
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}{path}"


def _payment_method(payment_data):
    payment_type = payment_data.get("payment_type_id", "")
    if payment_type in {"credit_card", "debit_card", "prepaid_card"}:
        return PaymentMethod.CARD
    if payment_type in {"account_money", "bank_transfer", "ticket"}:
        return PaymentMethod.TRANSFER
    return PaymentMethod.OTHER


def update_invoice_payment_status(invoice: Invoice):
    paid = invoice.payments.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    if paid <= 0:
        invoice.payment_status = PaymentStatus.PENDING
    elif paid < invoice.total:
        invoice.payment_status = PaymentStatus.PARTIAL
    else:
        invoice.payment_status = PaymentStatus.PAID
    invoice.save(update_fields=["payment_status", "updated_at"])


def create_preference(*, invoice: Invoice, request, user) -> MercadoPagoPayment:
    if invoice.payment_status == PaymentStatus.PAID:
        raise ValidationError({"invoice": "La factura ya esta abonada."})

    client = invoice.work_order.client
    idempotency_key = str(uuid.uuid4())
    payload = {
        "items": [
            {
                "id": str(invoice.id),
                "title": f"Factura {invoice.invoice_number}",
                "description": f"Orden {invoice.work_order.order_number} - {client.full_name}",
                "quantity": 1,
                "currency_id": "ARS",
                "unit_price": float(invoice.total),
            }
        ],
        "payer": {
            "name": client.first_name,
            "surname": client.last_name,
            "email": client.email or "",
            "phone": {"number": client.phone or ""},
        },
        "external_reference": str(invoice.id),
        "notification_url": _notification_url(request),
        "back_urls": {
            "success": _frontend_url(f"/billing?invoice={invoice.id}&mp_status=success"),
            "failure": _frontend_url(f"/billing?invoice={invoice.id}&mp_status=failure"),
            "pending": _frontend_url(f"/billing?invoice={invoice.id}&mp_status=pending"),
        },
        "auto_return": "approved",
        "metadata": {
            "invoice_id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "client_id": str(client.id),
        },
    }
    preference = _api_request("POST", "/checkout/preferences", payload, idempotency_key=idempotency_key)
    record = MercadoPagoPayment.objects.create(
        invoice=invoice,
        preference_id=preference.get("id", ""),
        external_reference=str(invoice.id),
        status=MercadoPagoPaymentStatus.CREATED,
        amount=invoice.total,
        init_point=preference.get("init_point", ""),
        sandbox_init_point=preference.get("sandbox_init_point", ""),
        raw_preference=preference,
        created_by=user if getattr(user, "is_authenticated", False) else None,
    )
    create_audit_log(
        request=request,
        module="billing_mercadopago",
        action=AuditAction.CREATE,
        object_type="MercadoPagoPayment",
        object_id=record.pk,
        new_data={"invoice": str(invoice.pk), "preference_id": record.preference_id, "amount": str(record.amount)},
    )
    return record


def get_payment(payment_id: str):
    return _api_request("GET", f"/v1/payments/{payment_id}")


def verify_webhook_signature(request, data_id: str) -> bool:
    secret = settings.MERCADOPAGO_WEBHOOK_SECRET.strip()
    if not secret:
        return True

    signature = request.headers.get("x-signature", "")
    request_id = request.headers.get("x-request-id", "")
    parts = {}
    for part in signature.split(","):
        key, _, value = part.partition("=")
        if key and value:
            parts[key.strip()] = value.strip()

    timestamp = parts.get("ts")
    received_hash = parts.get("v1")
    if not timestamp or not received_hash:
        return False

    manifest = f"id:{data_id};request-id:{request_id};ts:{timestamp};"
    expected_hash = hmac.new(secret.encode("utf-8"), manifest.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_hash, received_hash)


@transaction.atomic
def register_payment_from_mercadopago(payment_data: dict, request=None) -> MercadoPagoPayment:
    payment_id = str(payment_data.get("id") or "")
    external_reference = str(payment_data.get("external_reference") or payment_data.get("metadata", {}).get("invoice_id") or "")
    if not payment_id:
        raise ValidationError({"payment": "La notificacion no contiene id de pago."})
    if not external_reference:
        raise ValidationError({"payment": "El pago no tiene external_reference de factura."})

    try:
        invoice = Invoice.objects.select_for_update().select_related("work_order", "work_order__client").get(id=external_reference)
    except Invoice.DoesNotExist as exc:
        raise ValidationError({"invoice": "No existe la factura informada por Mercado Pago."}) from exc

    status = payment_data.get("status") or MercadoPagoPaymentStatus.UNKNOWN
    status = status if status in MercadoPagoPaymentStatus.values else MercadoPagoPaymentStatus.UNKNOWN
    amount = Decimal(str(payment_data.get("transaction_amount") or payment_data.get("total_paid_amount") or invoice.total))
    paid_at = None
    if payment_data.get("date_approved"):
        paid_at = timezone.datetime.fromisoformat(payment_data["date_approved"].replace("Z", "+00:00"))

    record = MercadoPagoPayment.objects.select_for_update().filter(payment_id=payment_id).first()
    if not record:
        pending_records = MercadoPagoPayment.objects.select_for_update().filter(invoice=invoice, payment_id="")
        preference_id = payment_data.get("preference_id")
        if preference_id:
            pending_records = pending_records.filter(preference_id=preference_id)
        record = pending_records.order_by("-created_at").first()
    if not record:
        record = MercadoPagoPayment(invoice=invoice, external_reference=external_reference, amount=amount)
    record.payment_id = payment_id
    record.invoice = invoice
    record.external_reference = external_reference
    record.preference_id = payment_data.get("preference_id") or record.preference_id
    record.merchant_order_id = str(payment_data.get("order", {}).get("id") or record.merchant_order_id or "")
    record.status = status
    record.status_detail = payment_data.get("status_detail") or ""
    record.amount = amount
    record.raw_payment = payment_data
    if status == MercadoPagoPaymentStatus.APPROVED:
        record.paid_at = paid_at or timezone.now()
    record.save()

    if status == MercadoPagoPaymentStatus.APPROVED:
        reference = f"MP-{payment_id}"
        if not Payment.objects.filter(invoice=invoice, reference=reference).exists():
            Payment.objects.create(
                invoice=invoice,
                amount=amount,
                method=_payment_method(payment_data),
                paid_at=record.paid_at or timezone.now(),
                reference=reference,
                notes=f"Mercado Pago {payment_data.get('payment_method_id', '')}".strip(),
            )
        paid = invoice.payments.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        if paid <= 0:
            invoice.payment_status = PaymentStatus.PENDING
        elif paid < invoice.total:
            invoice.payment_status = PaymentStatus.PARTIAL
        else:
            invoice.payment_status = PaymentStatus.PAID
        invoice.save(update_fields=["payment_status", "updated_at"])

    create_audit_log(
        request=request,
        module="billing_mercadopago",
        action=AuditAction.STATUS_CHANGE,
        object_type="MercadoPagoPayment",
        object_id=record.pk,
        new_data={
            "invoice": str(invoice.pk),
            "payment_id": payment_id,
            "status": record.status,
            "payment_status": invoice.payment_status,
        },
    )
    return record
