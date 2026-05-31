from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from .models import WorkOrder


def generate_order_number() -> str:
    year = timezone.now().year
    prefix = f"OT-{year}-"
    last = (
        WorkOrder.all_objects.filter(order_number__startswith=prefix)
        .order_by("-order_number")
        .first()
    )
    if not last:
        return f"{prefix}0001"
    try:
        number = int(last.order_number.rsplit("-", 1)[1]) + 1
    except (IndexError, ValueError):
        number = 1
    return f"{prefix}{number:04d}"


@transaction.atomic
def ensure_order_number(instance: WorkOrder) -> None:
    if instance.order_number:
        return
    instance.order_number = generate_order_number()

