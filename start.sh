#!/usr/bin/env bash
set -o errexit

cd backend
gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}
