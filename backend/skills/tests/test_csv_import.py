import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from skills.models import Skill, SkillCategory

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skills/import-csv/'


@pytest.fixture
def admin_client(db):
    user = User.objects.create_user(username='admin', password='pw!', is_staff=True)
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def regular_client(db):
    user = User.objects.create_user(username='user', password='pw!')
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def make_csv(content: str) -> SimpleUploadedFile:
    return SimpleUploadedFile('skills.csv', content.encode('utf-8'), content_type='text/csv')


def test_import_creates_skills_and_categories(admin_client):
    csv = make_csv('name,category\nPython,Programming\nDocker,Ops\n')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_200_OK
    assert r.data['created'] == 2
    assert Skill.objects.count() == 2
    assert SkillCategory.objects.count() == 2


def test_import_reuses_existing_category(admin_client):
    SkillCategory.objects.create(name='Programming')

    csv = make_csv('name,category\nPython,Programming\n')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_200_OK
    assert r.data['created'] == 1
    assert SkillCategory.objects.count() == 1


def test_import_skips_existing_skills(admin_client):
    cat = SkillCategory.objects.create(name='Programming')
    Skill.objects.create(name='Python', category=cat)

    csv = make_csv('name,category\nPython,Programming\nGo,Programming\n')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_200_OK
    assert r.data['created'] == 1
    assert r.data['skipped'] == 1
    assert Skill.objects.count() == 2


def test_import_reports_missing_fields(admin_client):
    csv = make_csv('name,category\n,Programming\nPython,\n')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_200_OK
    assert r.data['created'] == 0
    assert len(r.data['errors']) == 2


def test_import_rejects_missing_columns(admin_client):
    csv = make_csv('skill,cat\nPython,Programming\n')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_import_forbidden_for_regular_user(regular_client):
    csv = make_csv('name,category\nPython,Programming\n')
    r = regular_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_403_FORBIDDEN
