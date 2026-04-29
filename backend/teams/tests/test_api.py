import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from teams.models import Department, Team


pytestmark = pytest.mark.django_db

User = get_user_model()


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


def test_admin_can_create_department(admin_client):
    r = admin_client.post('/api/departments/', {'name': 'Engineering'}, format='json')
    assert r.status_code == status.HTTP_201_CREATED


def test_admin_can_crud_department(admin_client):
    r = admin_client.post('/api/departments/', {'name': 'Engineering'}, format='json')
    dept_id = r.data['id']

    r = admin_client.patch(f'/api/departments/{dept_id}/', {'name': 'Eng'}, format='json')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['name'] == 'Eng'

    r = admin_client.delete(f'/api/departments/{dept_id}/')
    assert r.status_code == status.HTTP_204_NO_CONTENT


def test_admin_can_create_team_with_members(admin_client):
    dept = Department.objects.create(name='Eng')
    alice = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com')
    bob = Employee.objects.create(first_name='Bob', last_name='B', email='b@x.com')
    r = admin_client.post(
        '/api/teams/',
        {'name': 'Core', 'department': dept.id, 'members': [alice.id, bob.id], 'team_leads': [bob.id]},
        format='json',
    )
    assert r.status_code == status.HTTP_201_CREATED
    team = Team.objects.get(pk=r.data['id'])
    assert set(team.members.all()) == {alice, bob}
    assert list(team.team_leads.all()) == [bob]


def test_admin_can_update_team(admin_client):
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)

    r = admin_client.patch(f'/api/teams/{team.id}/', {'name': 'Platform'}, format='json')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['name'] == 'Platform'


def test_admin_can_delete_team(admin_client):
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)

    r = admin_client.delete(f'/api/teams/{team.id}/')
    assert r.status_code == status.HTTP_204_NO_CONTENT
    assert Team.objects.filter(pk=team.id).count() == 0


def test_regular_user_cannot_update_team(regular_client):
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)

    r = regular_client.patch(f'/api/teams/{team.id}/', {'name': 'X'}, format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_regular_user_cannot_delete_team(regular_client):
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)

    r = regular_client.delete(f'/api/teams/{team.id}/')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_regular_user_can_list_but_not_create(regular_client):
    r = regular_client.get('/api/departments/')
    assert r.status_code == status.HTTP_200_OK

    r = regular_client.post('/api/departments/', {'name': 'X'}, format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN
