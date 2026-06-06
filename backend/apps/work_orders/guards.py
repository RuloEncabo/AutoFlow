from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.core.permissions import ADMIN_ROLE

from .models import WorkOrderStatus


def is_admin_user(user) -> bool:
    return bool(user and user.is_authenticated and (user.is_superuser or getattr(user, "role", "") == ADMIN_ROLE))


def ensure_work_order_editable(work_order, user, action="modificar"):
    if work_order.status == WorkOrderStatus.CLOSED and not is_admin_user(user):
        raise PermissionDenied(
            f"La orden {work_order.order_number} esta cerrada. Solo un administrador puede {action}."
        )


def ensure_work_order_can_close(work_order):
    if work_order.tasks_total == 0:
        raise ValidationError({"status": "No se puede cerrar una orden sin tareas asignadas."})
    if work_order.tasks_pending > 0:
        raise ValidationError({"status": "Para cerrar la orden todas las tareas deben estar completadas."})
