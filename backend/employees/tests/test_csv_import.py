
import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/employees/import-csv/'


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
    return SimpleUploadedFile('employees.csv', content.encode('utf-8'), content_type='text/csv')


def test_import_creates_employees(admin_client):
    csv = make_csv('first_name,last_name,email\nAda,Lovelace,ada@example.com\nAlan,Turing,alan@example.com\n')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_200_OK
    assert r.data['created'] == 2
    assert r.data['skipped'] == 0
    assert r.data['errors'] == []
    assert Employee.objects.count() == 2


def test_import_skips_existing_emails(admin_client):
    Employee.objects.create(first_name='Ada', last_name='Lovelace', email='ada@example.com')

    csv = make_csv('first_name,last_name,email\nAda,Lovelace,ada@example.com\nAlan,Turing,alan@example.com\n')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_200_OK
    assert r.data['created'] == 1
    assert r.data['skipped'] == 1
    assert Employee.objects.count() == 2


def test_import_reports_missing_fields(admin_client):
    csv = make_csv('first_name,last_name,email\n,Lovelace,ada@example.com\nAlan,Turing,alan@example.com\n')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_200_OK
    assert r.data['created'] == 1
    assert len(r.data['errors']) == 1
    assert r.data['errors'][0]['row'] == 2


def test_import_reports_invalid_email(admin_client):
    csv = make_csv('first_name,last_name,email\nAda,Lovelace,not-an-email\n')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_200_OK
    assert r.data['created'] == 0
    assert len(r.data['errors']) == 1


def test_import_rejects_missing_columns(admin_client):
    csv = make_csv('name,email\nAda,ada@example.com\n')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_400_BAD_REQUEST
    assert 'columns' in r.data['detail'].lower()


def test_import_rejects_no_file(admin_client):
    r = admin_client.post(URL, {}, format='multipart')

    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_import_forbidden_for_regular_user(regular_client):
    csv = make_csv('first_name,last_name,email\nAda,Lovelace,ada@example.com\n')
    r = regular_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_import_handles_utf8_bom(admin_client):
    content = 'first_name,last_name,email\nAda,Lovelace,ada@example.com\n'
    csv = SimpleUploadedFile('employees.csv', content.encode('utf-8-sig'), content_type='text/csv')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_200_OK
    assert r.data['created'] == 1


def test_import_deduplicates_within_file(admin_client):
    csv = make_csv('first_name,last_name,email\nAda,Lovelace,ada@example.com\nAda,Lovelace,ada@example.com\n')
    r = admin_client.post(URL, {'file': csv}, format='multipart')

    assert r.status_code == status.HTTP_200_OK
    assert r.data['created'] == 1
    assert r.data['skipped'] == 1
    assert Employee.objects.count() == 1
