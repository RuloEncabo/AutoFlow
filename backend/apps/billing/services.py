from __future__ import annotations

from django.utils import timezone

from .models import Invoice


def generate_invoice_number() -> str:
    year = timezone.now().year
    prefix = f"FAC-{year}-"
    last = Invoice.all_objects.filter(invoice_number__startswith=prefix).order_by("-invoice_number").first()
    if not last:
        return f"{prefix}0001"
    try:
        number = int(last.invoice_number.rsplit("-", 1)[1]) + 1
    except (IndexError, ValueError):
        number = 1
    return f"{prefix}{number:04d}"

