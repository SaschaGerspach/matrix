import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Department, Employee, SkillCategory, Team


pytestmark = pytest.mark.django_db

User = get_user_model()

READONLY_ENDPOINTS = [
    '/api/departments/',
    '/api/teams/',
    '/api/employees/',
    '/api/skill-categories/',
    '/api/skills/',
]


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username='admin', password='pw12345!', is_staff=True)


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(username='regular', password='pw12345!')


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def regular_client(regular_user):
    client = APIClient()
    client.force_authenticate(user=regular_user)
    return client


@pytest.mark.parametrize('url', READONLY_ENDPOINTS)
def test_regular_user_can_read(regular_client, url):
    response = regular_client.get(url)
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.parametrize('url', READONLY_ENDPOINTS)
def test_regular_user_cannot_create(regular_client, url):
    response = regular_client.post(url, {}, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_regular_user_cannot_update(regular_client):
    dept = Department.objects.create(name='Eng')
    response = regular_client.patch(f'/api/departments/{dept.id}/', {'name': 'X'}, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_regular_user_cannot_delete(regular_client):
    dept = Department.objects.create(name='Eng')
    response = regular_client.delete(f'/api/departments/{dept.id}/')
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize('url', READONLY_ENDPOINTS)
def test_admin_can_create(admin_client, url):
    payloads = {
        '/api/departments/': {'name': 'Eng'},
        '/api/teams/': {'name': 'Core', 'department': Department.objects.create(name='D').id},
        '/api/employees/': {'first_name': 'A', 'last_name': 'B', 'email': 'a@b.com'},
        '/api/skill-categories/': {'name': 'Programming'},
        '/api/skills/': {'name': 'Python', 'category': SkillCategory.objects.create(name='P').id},
    }
    response = admin_client.post(url, payloads[url], format='json')
    assert response.status_code == status.HTTP_201_CREATED


def test_admin_can_update_and_delete(admin_client):
    dept = Department.objects.create(name='Eng')

    patch = admin_client.patch(f'/api/departments/{dept.id}/', {'name': 'X'}, format='json')
    assert patch.status_code == status.HTTP_200_OK

    delete = admin_client.delete(f'/api/departments/{dept.id}/')
    assert delete.status_code == status.HTTP_204_NO_CONTENT
