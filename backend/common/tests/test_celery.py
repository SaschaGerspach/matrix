import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from employees.tasks import import_employees_csv
from skills.models import Skill, SkillCategory
from skills.tasks import import_skills_csv

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_user(db):
    return get_user_model().objects.create_user(
        username='celery_admin', password='pw12345!', is_staff=True,
    )


def test_employee_import_task(admin_user):
    csv_content = 'first_name,last_name,email\nAlice,Smith,alice@test.com\nBob,Jones,bob@test.com'
    result = import_employees_csv(csv_content, admin_user.id)

    assert result['created'] == 2
    assert result['skipped'] == 0
    assert Employee.objects.filter(email='alice@test.com').exists()
    assert Employee.objects.filter(email='bob@test.com').exists()


def test_employee_import_task_skips_existing(admin_user):
    Employee.objects.create(first_name='Alice', last_name='Smith', email='alice@test.com')
    csv_content = 'first_name,last_name,email\nAlice,Smith,alice@test.com\nBob,Jones,bob@test.com'
    result = import_employees_csv(csv_content, admin_user.id)

    assert result['created'] == 1
    assert result['skipped'] == 1


def test_skill_import_task(admin_user):
    csv_content = 'name,category\nPython,Programming\nDocker,Ops'
    result = import_skills_csv(csv_content, admin_user.id)

    assert result['created'] == 2
    assert Skill.objects.filter(name='Python').exists()
    assert SkillCategory.objects.filter(name='Programming').exists()


def test_skill_import_task_skips_existing(admin_user):
    cat = SkillCategory.objects.create(name='Programming')
    Skill.objects.create(name='Python', category=cat)
    csv_content = 'name,category\nPython,Programming\nDocker,Ops'
    result = import_skills_csv(csv_content, admin_user.id)

    assert result['created'] == 1
    assert result['skipped'] == 1


def test_async_employee_import_returns_task_id(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)

    from django.core.files.uploadedfile import SimpleUploadedFile

    csv_bytes = b'first_name,last_name,email\nAlice,Smith,alice@test.com'
    file = SimpleUploadedFile('employees.csv', csv_bytes, content_type='text/csv')

    response = client.post(
        '/api/employees/import-csv/?async=true',
        {'file': file},
        format='multipart',
    )
    assert response.status_code == status.HTTP_202_ACCEPTED
    assert 'task_id' in response.data

    assert Employee.objects.filter(email='alice@test.com').exists()


def test_async_skill_import_returns_task_id(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)

    from django.core.files.uploadedfile import SimpleUploadedFile

    csv_bytes = b'name,category\nPython,Programming'
    file = SimpleUploadedFile('skills.csv', csv_bytes, content_type='text/csv')

    response = client.post(
        '/api/skills/import-csv/?async=true',
        {'file': file},
        format='multipart',
    )
    assert response.status_code == status.HTTP_202_ACCEPTED
    assert 'task_id' in response.data

    assert Skill.objects.filter(name='Python').exists()


def test_task_status_endpoint_returns_200(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)

    response = client.get('/api/tasks/nonexistent-id/status/')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['task_id'] == 'nonexistent-id'
    assert response.data['status'] == 'PENDING'


def test_eager_task_returns_result_directly(admin_user):
    csv_content = 'first_name,last_name,email\nAlice,Smith,alice@test.com'
    result = import_employees_csv.delay(csv_content, admin_user.id)

    assert result.successful()
    assert result.result['created'] == 1


def test_task_status_requires_admin(admin_user):
    non_admin = get_user_model().objects.create_user(username='regular', password='pw12345!')
    client = APIClient()
    client.force_authenticate(user=non_admin)
    response = client.get('/api/tasks/some-id/status/')
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_task_status_rejects_anonymous():
    client = APIClient()
    response = client.get('/api/tasks/some-id/status/')
    assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_employee_csv_rejects_oversized_file(admin_user):
    from django.core.files.uploadedfile import SimpleUploadedFile

    client = APIClient()
    client.force_authenticate(user=admin_user)
    large_content = b'first_name,last_name,email\n' + b'A,B,a@b.com\n' * 500_000
    file = SimpleUploadedFile('big.csv', large_content, content_type='text/csv')

    response = client.post('/api/employees/import-csv/', {'file': file}, format='multipart')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'too large' in response.data['detail'].lower()


def test_skill_csv_rejects_oversized_file(admin_user):
    from django.core.files.uploadedfile import SimpleUploadedFile

    client = APIClient()
    client.force_authenticate(user=admin_user)
    large_content = b'name,category\n' + b'Skill,Cat\n' * 600_000
    file = SimpleUploadedFile('big.csv', large_content, content_type='text/csv')

    response = client.post('/api/skills/import-csv/', {'file': file}, format='multipart')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'too large' in response.data['detail'].lower()
