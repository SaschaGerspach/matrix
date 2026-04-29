import csv
import io

from celery import shared_task
from django.contrib.auth import get_user_model
from django.db import transaction

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

    with transaction.atomic():
        for i, row in enumerate(reader, start=2):
            email = (row.get('email') or '').strip().lower()
            first_name = (row.get('first_name') or '').strip()
            last_name = (row.get('last_name') or '').strip()

            if not email or not first_name or not last_name:
                errors.append({'row': i, 'detail': 'Missing required field.'})
                continue

            try:
                drf_serializers.EmailField().run_validators(email)
            except drf_serializers.ValidationError:
                errors.append({'row': i, 'detail': f'Invalid email: {email}'})
                continue

            _, was_created = Employee.objects.get_or_create(
                email=email,
                defaults={'first_name': first_name, 'last_name': last_name},
            )
            if was_created:
                created.append({'row': i, 'email': email})
            else:
                skipped.append({'row': i, 'email': email})

    if created:
        user = get_user_model().objects.filter(id=user_id).first()
        if user:
            log_action(
                user=user,
                action=AuditLog.Action.IMPORT,
                entity_type='Employee',
                detail=f'Imported {len(created)} employees',
            )
        from skills.views.analytics import invalidate_analytics_cache
        invalidate_analytics_cache()

    return {
        'created': len(created),
        'skipped': len(skipped),
        'errors': errors,
    }
