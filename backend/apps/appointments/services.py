from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from apps.audit.models import AuditAction
from apps.audit.services import create_audit_log

from .models import Appointment, AppointmentCommunication, CommunicationChannel, CommunicationStatus

notification_logger = logging.getLogger("notifications")


def build_appointment_message(appointment: Appointment) -> str:
    local_dt = timezone.localtime(appointment.scheduled_at)
    client_name = appointment.client.full_name
    vehicle = appointment.vehicle
    vehicle_text = f"{vehicle.brand} {vehicle.model}" if vehicle else "Vehiculo a confirmar"
    plate_text = vehicle.plate if vehicle else "Sin patente asociada"
    notes = appointment.notes or "Sin observaciones"

    return (
        f"Hola {client_name}, confirmamos tu turno en {settings.WORKSHOP_NAME}.\n\n"
        f"Vehiculo: {vehicle_text}\n"
        f"Patente: {plate_text}\n"
        f"Fecha: {local_dt:%d/%m/%Y}\n"
        f"Hora: {local_dt:%H:%M}\n"
        f"Direccion: {settings.WORKSHOP_ADDRESS or 'Direccion del taller'}\n"
        f"Observaciones: {notes}\n"
        f"Contacto: {settings.WORKSHOP_CONTACT or 'Contacto del taller'}"
    )


def _create_communication(
    *,
    appointment: Appointment,
    channel: str,
    recipient: str,
    message: str,
    user,
    status: str = CommunicationStatus.PENDING,
    error_message: str = "",
) -> AppointmentCommunication:
    sent_at = timezone.now() if status == CommunicationStatus.SENT else None
    return AppointmentCommunication.objects.create(
        appointment=appointment,
        channel=channel,
        recipient=recipient,
        message=message,
        status=status,
        sent_at=sent_at,
        error_message=error_message,
        created_by=user if getattr(user, "is_authenticated", False) else None,
    )


def send_email_notification(*, appointment: Appointment, request=None, user=None) -> AppointmentCommunication:
    message = build_appointment_message(appointment)
    recipient = appointment.client.email
    actor = user or getattr(request, "user", None)

    if not recipient:
        communication = _create_communication(
            appointment=appointment,
            channel=CommunicationChannel.EMAIL,
            recipient="",
            message=message,
            user=actor,
            status=CommunicationStatus.FAILED,
            error_message="El cliente no tiene email configurado.",
        )
    else:
        communication = _create_communication(
            appointment=appointment,
            channel=CommunicationChannel.EMAIL,
            recipient=recipient,
            message=message,
            user=actor,
        )
        try:
            send_mail(
                subject=f"Confirmacion de turno - {settings.WORKSHOP_NAME}",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
            communication.status = CommunicationStatus.SENT
            communication.sent_at = timezone.now()
            communication.error_message = ""
            communication.save(update_fields=["status", "sent_at", "error_message"])
        except Exception as exc:  # pragma: no cover - depends on external SMTP
            notification_logger.exception("email appointment=%s failed", appointment.pk)
            communication.status = CommunicationStatus.FAILED
            communication.error_message = str(exc)
            communication.save(update_fields=["status", "error_message"])

    create_audit_log(
        request=request,
        user=actor,
        module="appointments",
        action=AuditAction.SEND_NOTIFICATION,
        object_type="Appointment",
        object_id=appointment.pk,
        new_data={"channel": "email", "communication": str(communication.pk), "status": communication.status},
    )
    return communication


def send_whatsapp_notification(*, appointment: Appointment, request=None, user=None) -> AppointmentCommunication:
    message = build_appointment_message(appointment)
    recipient = appointment.client.phone
    actor = user or getattr(request, "user", None)

    if not recipient:
        status = CommunicationStatus.FAILED
        error = "El cliente no tiene telefono configurado."
    elif settings.WHATSAPP_PROVIDER == "disabled":
        status = CommunicationStatus.FAILED
        error = "WhatsApp Business API no configurada. Canal preparado para integracion."
    else:
        status = CommunicationStatus.PENDING
        error = "Proveedor WhatsApp configurado pendiente de implementacion HTTP."

    communication = _create_communication(
        appointment=appointment,
        channel=CommunicationChannel.WHATSAPP,
        recipient=recipient or "",
        message=message,
        user=actor,
        status=status,
        error_message=error,
    )

    create_audit_log(
        request=request,
        user=actor,
        module="appointments",
        action=AuditAction.SEND_NOTIFICATION,
        object_type="Appointment",
        object_id=appointment.pk,
        new_data={"channel": "whatsapp", "communication": str(communication.pk), "status": communication.status},
    )
    return communication

