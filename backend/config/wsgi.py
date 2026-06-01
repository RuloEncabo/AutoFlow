"""WSGI config for AutoFlow."""

import os

from django.core.wsgi import get_wsgi_application


def configure_settings_module() -> None:
    current = os.getenv("DJANGO_SETTINGS_MODULE", "")
    if current in {"", "config.settings.local"}:
        os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
        return
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")


configure_settings_module()

application = get_wsgi_application()
