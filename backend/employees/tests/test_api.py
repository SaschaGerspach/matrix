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
    assert r.data['count'] == 1
    assert len(r.data['results']) == 1


def test_regular_user_cannot_create_employee(regular_client):
    r = regular_client.post(URL, {'first_name': 'A', 'last_name': 'B', 'email': 'a@b.com'}, format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_unauthenticated_access_rejected():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_admin_can_update_employee(admin_client):
    r = admin_client.post(URL, {'first_name': 'Ada', 'last_name': 'Lovelace', 'email': 'ada@example.com'}, format='json')
    emp_id = r.data['id']

    r = admin_client.patch(f'{URL}{emp_id}/', {'first_name': 'Augusta'}, format='json')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['first_name'] == 'Augusta'


def test_admin_can_delete_employee(admin_client):
    r = admin_client.post(URL, {'first_name': 'Ada', 'last_name': 'Lovelace', 'email': 'ada@example.com'}, format='json')
    emp_id = r.data['id']

    r = admin_client.delete(f'{URL}{emp_id}/')
    assert r.status_code == status.HTTP_204_NO_CONTENT
    assert Employee.objects.filter(pk=emp_id).count() == 0


def test_regular_user_cannot_update_employee(regular_client):
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    r = regular_client.patch(f'{URL}{emp.id}/', {'first_name': 'X'}, format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_regular_user_cannot_delete_employee(regular_client):
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    r = regular_client.delete(f'{URL}{emp.id}/')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_search_filters_employees(regular_client):
    Employee.objects.create(first_name='Ada', last_name='Lovelace', email='ada@example.com')
    Employee.objects.create(first_name='Alan', last_name='Turing', email='alan@example.com')
    Employee.objects.create(first_name='Grace', last_name='Hopper', email='grace@example.com')

    r = regular_client.get(URL, {'search': 'ada'})
    assert r.status_code == status.HTTP_200_OK
    assert r.data['count'] == 1
    assert r.data['results'][0]['first_name'] == 'Ada'

    r = regular_client.get(URL, {'search': 'example'})
    assert r.data['count'] == 3
