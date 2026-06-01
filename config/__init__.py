"""Root import shim for Render.

Render may run `gunicorn config.wsgi:application` from the repository root.
The Django project lives in `backend/config`, so this package extends the
module search path to make `config.settings.*` available from both locations.
"""

from pathlib import Path

BACKEND_CONFIG_DIR = Path(__file__).resolve().parents[1] / "backend" / "config"
if BACKEND_CONFIG_DIR.exists():
    __path__.append(str(BACKEND_CONFIG_DIR))
