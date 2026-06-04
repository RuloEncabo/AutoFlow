from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import int_to_base36, urlsafe_base64_encode

from apps.audit.models import AuditAction
from apps.audit.services import create_audit_log
from apps.core.emailing import send_configured_email
from apps.core.services import get_workshop_profile


logger = logging.getLogger("notifications")
User = get_user_model()


def _password_reset_url(profile, uid, token):
    configured = (profile.password_reset_frontend_url or "").strip()
    if configured:
        if "{uid}" in configured or "{token}" in configured:
            return configured.format(uid=uid, token=token)
        return f"{configured.rstrip('/')}/{uid}/{token}"
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password/{uid}/{token}"


def _token_age_minutes(token):
    try:
        timestamp = token.split("-", 1)[0]
        token_created = int(timestamp, 36)
        now = default_token_generator._num_seconds(default_token_generator._now())
        return max((now - token_created) // 60, 0)
    except Exception:
        return None


def send_password_reset_email(*, email, request=None):
    profile = get_workshop_profile()
    if not profile.password_reset_enabled:
        raise ValueError("La recuperacion de contrasena no esta habilitada.")

    user = User.objects.filter(email__iexact=email, is_active=True, deleted_at__isnull=True).first()
    create_audit_log(
        request=request,
        user=user,
        module="auth_password_reset",
        action=AuditAction.SEND_NOTIFICATION,
        object_type="User",
        object_id=user.pk if user else "",
        new_data={"email": email, "user_found": bool(user)},
    )
    if not user:
        logger.info("password reset requested for non-existing email=%s", email)
        return False

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = _password_reset_url(profile, uid, token)
    minutes = profile.password_reset_token_minutes or 60
    subject = f"Recuperar contrasena - {profile.name}"
    text_body = (
        f"Hola {user.full_name}.\n\n"
        "Recibimos una solicitud para restablecer tu contrasena de AutoFlow.\n\n"
        f"Ingresa al siguiente enlace para crear una nueva contrasena:\n{reset_url}\n\n"
        f"El enlace vence en {minutes} minutos.\n"
        "Si no solicitaste este cambio, podes ignorar este mensaje."
    )
    html_body = (
        f"<p>Hola {user.full_name}.</p>"
        "<p>Recibimos una solicitud para restablecer tu contrasena de AutoFlow.</p>"
        f'<p><a href="{reset_url}">Crear nueva contrasena</a></p>'
        f"<p>El enlace vence en {minutes} minutos.</p>"
        "<p>Si no solicitaste este cambio, podes ignorar este mensaje.</p>"
    )
    send_configured_email(
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        recipients=[user.email],
        profile=profile,
    )
    return True


def reset_password(*, user, token, new_password, request=None):
    profile = get_workshop_profile()
    age_minutes = _token_age_minutes(token)
    if age_minutes is None or age_minutes > (profile.password_reset_token_minutes or 60):
        raise ValueError("El enlace de recuperacion esta vencido.")
    if not default_token_generator.check_token(user, token):
        raise ValueError("El enlace de recuperacion no es valido.")
    user.set_password(new_password)
    user.save(update_fields=["password"])
    create_audit_log(
        request=request,
        user=user,
        module="auth_password_reset",
        action=AuditAction.UPDATE,
        object_type="User",
        object_id=user.pk,
        new_data={"password_reset": True},
    )
    return user
