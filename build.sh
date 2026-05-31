#!/usr/bin/env bash
set -o errexit

python -m pip install --upgrade pip
pip install -r backend/requirements.txt
cd backend
python manage.py collectstatic --noinput
python manage.py migrate
