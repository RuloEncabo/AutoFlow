from django.conf import settings

from .models import WorkshopProfile


def get_workshop_profile() -> WorkshopProfile:
    profile, _ = WorkshopProfile.objects.get_or_create(
        pk=1,
        defaults={
            "name": settings.WORKSHOP_NAME or "AutoFlow Taller",
            "address": settings.WORKSHOP_ADDRESS or "",
            "phone": settings.WORKSHOP_CONTACT or "",
            "whatsapp": "",
            "email": settings.DEFAULT_FROM_EMAIL or "",
            "email_from_name": settings.WORKSHOP_NAME or "AutoFlow Taller",
            "email_from_address": settings.DEFAULT_FROM_EMAIL or "",
            "smtp_host": settings.EMAIL_HOST or "",
            "smtp_port": settings.EMAIL_PORT or 587,
            "smtp_username": settings.EMAIL_HOST_USER or "",
            "smtp_password": settings.EMAIL_HOST_PASSWORD or "",
            "smtp_use_tls": settings.EMAIL_USE_TLS,
            "smtp_use_ssl": getattr(settings, "EMAIL_USE_SSL", False),
            "password_reset_frontend_url": f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password",
        },
    )
    return profile
