import csv
import io

from celery import shared_task
from django.contrib.auth import get_user_model
from django.db import transaction

from common.audit import log_action
from common.models import AuditLog

from .models import Skill, SkillCategory


@shared_task
def import_skills_csv(csv_content, user_id):
    reader = csv.DictReader(io.StringIO(csv_content))

    created = []
    skipped = []
    errors = []
    category_cache = {}

    with transaction.atomic():
        for i, row in enumerate(reader, start=2):
            name = (row.get('name') or '').strip()
            category_name = (row.get('category') or '').strip()

            if not name or not category_name:
                errors.append({'row': i, 'detail': 'Missing required field.'})
                continue

            if category_name not in category_cache:
                cat, _ = SkillCategory.objects.get_or_create(name=category_name)
                category_cache[category_name] = cat

            _, was_created = Skill.objects.get_or_create(
                name=name,
                category=category_cache[category_name],
            )
            if was_created:
                created.append({'row': i, 'name': name, 'category': category_name})
            else:
                skipped.append({'row': i, 'name': name})

    if created:
        user = get_user_model().objects.filter(id=user_id).first()
        if user:
            log_action(
                user=user,
                action=AuditLog.Action.IMPORT,
                entity_type='Skill',
                detail=f'Imported {len(created)} skills',
            )
        from skills.views.analytics import invalidate_analytics_cache
        invalidate_analytics_cache()

    return {
        'created': len(created),
        'skipped': len(skipped),
        'errors': errors,
    }


@shared_task
def generate_matrix_pdf():
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

    from employees.models import Employee
    from .models import SkillAssignment

    employees = list(Employee.objects.all().order_by('last_name', 'first_name'))
    skills = list(Skill.objects.select_related('category').order_by('category__name', 'name'))
    assignments = SkillAssignment.objects.all()

    assignment_map = {}
    for a in assignments:
        assignment_map.setdefault(a.employee_id, {})[a.skill_id] = a.level

    header = ['Employee'] + [s.name for s in skills]
    data = [header]
    for emp in employees:
        row = [str(emp)]
        emp_skills = assignment_map.get(emp.id, {})
        for s in skills:
            level = emp_skills.get(s.id)
            row.append(str(level) if level else '')
        data.append(row)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4))
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
    ]))
    doc.build([table])

    import base64
    return base64.b64encode(buf.getvalue()).decode('ascii')
