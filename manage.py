#!/usr/bin/env python
"""Root Django entrypoint for Render deployments.

The real project lives in ./backend, but some hosts run build commands from the
repository root. This shim keeps `python manage.py ...` working in that case.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


def main() -> None:
    backend_dir = Path(__file__).resolve().parent / "backend"
    sys.path.insert(0, str(backend_dir))
    current = os.getenv("DJANGO_SETTINGS_MODULE", "")
    is_render = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID") or os.getenv("RENDER_EXTERNAL_HOSTNAME"))
    if is_render and current in {"", "config.settings.local"}:
        os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
    else:
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
