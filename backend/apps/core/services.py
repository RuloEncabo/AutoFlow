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
        },
    )
    return profile
