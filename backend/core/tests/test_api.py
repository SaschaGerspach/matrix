import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from core.models import (
    Department,
    Employee,
    Skill,
    SkillAssignment,
    SkillCategory,
    Team,
)


pytestmark = pytest.mark.django_db


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username='tester', password='pw12345!')


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def anon_client():
    return APIClient()


ENDPOINTS = [
    '/api/departments/',
    '/api/teams/',
    '/api/employees/',
    '/api/skill-categories/',
    '/api/skills/',
    '/api/skill-assignments/',
]


@pytest.mark.parametrize('url', ENDPOINTS)
def test_unauthenticated_access_is_rejected(anon_client, url):
    response = anon_client.get(url)
    assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_department_crud_roundtrip(auth_client):
    create = auth_client.post('/api/departments/', {'name': 'Engineering'}, format='json')
    assert create.status_code == status.HTTP_201_CREATED
    dept_id = create.data['id']

    lst = auth_client.get('/api/departments/')
    assert lst.status_code == status.HTTP_200_OK
    assert any(d['id'] == dept_id for d in lst.data)

    detail = auth_client.get(f'/api/departments/{dept_id}/')
    assert detail.status_code == status.HTTP_200_OK
    assert detail.data['name'] == 'Engineering'

    patch = auth_client.patch(f'/api/departments/{dept_id}/', {'name': 'Eng'}, format='json')
    assert patch.status_code == status.HTTP_200_OK
    assert patch.data['name'] == 'Eng'

    delete = auth_client.delete(f'/api/departments/{dept_id}/')
    assert delete.status_code == status.HTTP_204_NO_CONTENT
    assert Department.objects.filter(pk=dept_id).count() == 0


def test_employee_create_returns_full_name(auth_client):
    response = auth_client.post(
        '/api/employees/',
        {'first_name': 'Ada', 'last_name': 'Lovelace', 'email': 'ada@example.com'},
        format='json',
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['full_name'] == 'Ada Lovelace'


def test_team_with_members_and_leads(auth_client):
    dept = Department.objects.create(name='Eng')
    alice = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com')
    bob = Employee.objects.create(first_name='Bob', last_name='B', email='b@x.com')
    response = auth_client.post(
        '/api/teams/',
        {
            'name': 'Core',
            'department': dept.id,
            'members': [alice.id, bob.id],
            'team_leads': [bob.id],
        },
        format='json',
    )
    assert response.status_code == status.HTTP_201_CREATED
    team = Team.objects.get(pk=response.data['id'])
    assert set(team.members.all()) == {alice, bob}
    assert list(team.team_leads.all()) == [bob]


@pytest.mark.parametrize('bad_level', [0, 6, -1, 99])
def test_skill_assignment_rejects_level_out_of_range(auth_client, bad_level):
    cat = SkillCategory.objects.create(name='Programming')
    skill = Skill.objects.create(name='Python', category=cat)
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    response = auth_client.post(
        '/api/skill-assignments/',
        {'employee': emp.id, 'skill': skill.id, 'level': bad_level},
        format='json',
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'level' in response.data


def test_skill_assignment_ignores_read_only_fields_on_create(auth_client):
    cat = SkillCategory.objects.create(name='Programming')
    skill = Skill.objects.create(name='Python', category=cat)
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    response = auth_client.post(
        '/api/skill-assignments/',
        {
            'employee': emp.id,
            'skill': skill.id,
            'level': 3,
            'status': 'confirmed',
            'confirmed_by': emp.id,
        },
        format='json',
    )
    assert response.status_code == status.HTTP_201_CREATED
    sa = SkillAssignment.objects.get(pk=response.data['id'])
    assert sa.status == SkillAssignment.Status.PENDING
    assert sa.confirmed_by is None
    assert sa.confirmed_at is None
