from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection

from apps.core.services import get_workshop_profile


logger = logging.getLogger("notifications")


class EmailConfigurationError(Exception):
    pass


def _sender(profile):
    address = profile.email_from_address or profile.email or settings.DEFAULT_FROM_EMAIL
    name = profile.email_from_name or profile.name
    return f"{name} <{address}>" if name and address else address


def _connection(profile):
    if not profile.email_service_enabled:
        raise EmailConfigurationError("El servicio de email no esta habilitado.")

    if profile.smtp_host:
        host = profile.smtp_host
        port = profile.smtp_port
        username = profile.smtp_username
        password = profile.smtp_password
        use_tls = profile.smtp_use_tls
        use_ssl = profile.smtp_use_ssl
    else:
        host = settings.EMAIL_HOST
        port = settings.EMAIL_PORT
        username = settings.EMAIL_HOST_USER
        password = settings.EMAIL_HOST_PASSWORD
        use_tls = settings.EMAIL_USE_TLS
        use_ssl = getattr(settings, "EMAIL_USE_SSL", False)

    if not host:
        raise EmailConfigurationError("No hay servidor SMTP configurado.")

    return get_connection(
        backend="django.core.mail.backends.smtp.EmailBackend",
        host=host,
        port=port,
        username=username,
        password=password,
        use_tls=use_tls,
        use_ssl=use_ssl,
        fail_silently=False,
    )


def send_configured_email(*, subject, text_body, recipients, html_body="", profile=None):
    profile = profile or get_workshop_profile()
    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=_sender(profile),
        to=recipients,
        connection=_connection(profile),
    )
    if html_body:
        message.attach_alternative(html_body, "text/html")
    sent = message.send()
    logger.info("email sent subject=%s recipients=%s", subject, ",".join(recipients))
    return sent
