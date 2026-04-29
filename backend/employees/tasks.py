import csv
import io

from celery import shared_task
from django.contrib.auth import get_user_model

from common.audit import log_action
from common.models import AuditLog

from .models import Employee


@shared_task
def import_employees_csv(csv_content, user_id):
    from rest_framework import serializers as drf_serializers

    reader = csv.DictReader(io.StringIO(csv_content))

    created = []
    skipped = []
    errors = []
    existing_emails = set(Employee.objects.values_list('email', flat=True))

    for i, row in enumerate(reader, start=2):
        email = (row.get('email') or '').strip().lower()
        first_name = (row.get('first_name') or '').strip()
        last_name = (row.get('last_name') or '').strip()

        if not email or not first_name or not last_name:
            errors.append({'row': i, 'detail': 'Missing required field.'})
            continue

        if email in existing_emails:
            skipped.append({'row': i, 'email': email})
            continue

        try:
            drf_serializers.EmailField().run_validators(email)
        except drf_serializers.ValidationError:
            errors.append({'row': i, 'detail': f'Invalid email: {email}'})
            continue

        Employee.objects.create(first_name=first_name, last_name=last_name, email=email)
        existing_emails.add(email)
        created.append({'row': i, 'email': email})

    if created:
        user = get_user_model().objects.filter(id=user_id).first()
        if user:
            log_action(
                user=user,
                action=AuditLog.Action.IMPORT,
                entity_type='Employee',
                detail=f'Imported {len(created)} employees',
            )

    return {
        'created': len(created),
        'skipped': len(skipped),
        'errors': errors,
    }
