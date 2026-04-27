import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from common.models import AuditLog
from skills.models import Skill, SkillCategory

pytestmark = pytest.mark.django_db

User = get_user_model()
AUDIT_URL = '/api/audit-log/'
CATEGORIES_URL = '/api/skill-categories/'


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username='admin', password='pw!', is_staff=True)


@pytest.fixture
def admin_client(admin_user):
    c = APIClient()
    c.force_authenticate(user=admin_user)
    return c


@pytest.fixture
def regular_client(db):
    user = User.objects.create_user(username='user', password='pw!')
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def test_creating_category_creates_audit_entry(admin_client, admin_user):
    admin_client.post(CATEGORIES_URL, {'name': 'Ops'}, format='json')

    assert AuditLog.objects.count() == 1
    entry = AuditLog.objects.first()
    assert entry.action == 'create'
    assert entry.entity_type == 'SkillCategory'
    assert entry.user == admin_user
    assert 'Ops' in entry.detail


def test_deleting_category_creates_audit_entry(admin_client):
    cat = SkillCategory.objects.create(name='Ops')
    admin_client.delete(f'{CATEGORIES_URL}{cat.pk}/')

    assert AuditLog.objects.filter(action='delete', entity_type='SkillCategory').count() == 1


def test_audit_log_list_endpoint(admin_client, admin_user):
    AuditLog.objects.create(
        user=admin_user, action='create', entity_type='Skill', entity_id=1, detail='Python',
    )
    r = admin_client.get(AUDIT_URL)

    assert r.status_code == status.HTTP_200_OK
    assert r.data['count'] == 1
    assert r.data['results'][0]['action'] == 'create'
    assert r.data['results'][0]['username'] == 'admin'


def test_audit_log_requires_auth():
    c = APIClient()
    r = c.get(AUDIT_URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_csv_import_creates_audit_entry(admin_client):
    from django.core.files.uploadedfile import SimpleUploadedFile

    csv = SimpleUploadedFile('s.csv', b'name,category\nPython,Programming\n', content_type='text/csv')
    admin_client.post('/api/skills/import-csv/', {'file': csv}, format='multipart')

    assert AuditLog.objects.filter(action='import', entity_type='Skill').count() == 1
