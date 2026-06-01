#!/usr/bin/env python
"""Django administrative entrypoint for AutoFlow."""

import os
import sys


def main() -> None:
    current = os.getenv("DJANGO_SETTINGS_MODULE", "")
    is_render = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID") or os.getenv("RENDER_EXTERNAL_HOSTNAME"))
    if is_render and current in {"", "config.settings.local"}:
        os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
    else:
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
