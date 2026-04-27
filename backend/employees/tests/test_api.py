import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee


pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/employees/'


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username='admin', password='pw!', is_staff=True)


@pytest.fixture
def admin_client(admin_user):
    c = APIClient()
    c.force_authenticate(user=admin_user)
    return c


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(username='user', password='pw!')


@pytest.fixture
def regular_client(regular_user):
    c = APIClient()
    c.force_authenticate(user=regular_user)
    return c


def test_admin_can_create_employee(admin_client):
    r = admin_client.post(URL, {'first_name': 'Ada', 'last_name': 'Lovelace', 'email': 'ada@example.com'}, format='json')
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['full_name'] == 'Ada Lovelace'


def test_regular_user_can_list_employees(regular_client):
    Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    r = regular_client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 1


def test_regular_user_cannot_create_employee(regular_client):
    r = regular_client.post(URL, {'first_name': 'A', 'last_name': 'B', 'email': 'a@b.com'}, format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_unauthenticated_access_rejected():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
