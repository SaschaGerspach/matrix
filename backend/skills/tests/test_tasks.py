import os

import pytest
from django.contrib.auth import get_user_model

from common.models import AuditLog
from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory
from skills.tasks import generate_matrix_pdf, import_skills_csv

pytestmark = pytest.mark.django_db

User = get_user_model()


class TestImportSkillsCsv:
    def test_creates_skills_and_logs(self):
        user = User.objects.create_user(username='admin', password='pw!')
        csv_content = 'name,category\nPython,Programming\nDocker,Ops\n'

        result = import_skills_csv(csv_content, user.id)

        assert result['created'] == 2
        assert result['skipped'] == 0
        assert result['errors'] == []
        assert Skill.objects.count() == 2
        assert SkillCategory.objects.count() == 2
        assert AuditLog.objects.filter(action=AuditLog.Action.IMPORT).exists()

    def test_skips_existing_and_no_audit_log(self):
        user = User.objects.create_user(username='admin', password='pw!')
        cat = SkillCategory.objects.create(name='Programming')
        Skill.objects.create(name='Python', category=cat)

        csv_content = 'name,category\nPython,Programming\n'
        result = import_skills_csv(csv_content, user.id)

        assert result['created'] == 0
        assert result['skipped'] == 1
        assert not AuditLog.objects.filter(action=AuditLog.Action.IMPORT).exists()

    def test_reports_missing_fields(self):
        user = User.objects.create_user(username='admin', password='pw!')
        csv_content = 'name,category\n,Programming\nPython,\n'

        result = import_skills_csv(csv_content, user.id)

        assert result['created'] == 0
        assert len(result['errors']) == 2

    def test_nonexistent_user_still_creates(self):
        csv_content = 'name,category\nPython,Programming\n'
        result = import_skills_csv(csv_content, 99999)

        assert result['created'] == 1
        assert not AuditLog.objects.filter(action=AuditLog.Action.IMPORT).exists()


class TestGenerateMatrixPdf:
    def test_generates_pdf_with_data(self, settings, tmp_path):
        settings.MEDIA_ROOT = str(tmp_path)

        emp = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com')
        cat = SkillCategory.objects.create(name='Programming')
        skill = Skill.objects.create(name='Python', category=cat)
        SkillAssignment.objects.create(employee=emp, skill=skill, level=4)

        result = generate_matrix_pdf()

        assert 'path' in result
        assert os.path.exists(result['path'])
        with open(result['path'], 'rb') as f:
            assert f.read(5) == b'%PDF-'

    def test_generates_pdf_empty(self, settings, tmp_path):
        settings.MEDIA_ROOT = str(tmp_path)

        result = generate_matrix_pdf()

        assert os.path.exists(result['path'])
        with open(result['path'], 'rb') as f:
            assert f.read(5) == b'%PDF-'

    def test_creates_export_directory(self, settings, tmp_path):
        settings.MEDIA_ROOT = str(tmp_path)
        Employee.objects.create(first_name='Bob', last_name='B', email='b@x.com')

        result = generate_matrix_pdf()

        export_dir = os.path.join(str(tmp_path), 'exports')
        assert os.path.isdir(export_dir)
        assert result['path'].startswith(export_dir)
