import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory
from teams.models import Department, Team


pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skill-matrix/'


@pytest.fixture
def user(db):
    return User.objects.create_user(username='u', password='pw!')


@pytest.fixture
def auth_client(user):
    employee = Employee.objects.create(first_name='A', last_name='B', email='a@b.com', user=user)
    c = APIClient()
    c.force_authenticate(user=user)
    return c, employee


@pytest.fixture
def skill(db):
    cat = SkillCategory.objects.create(name='Programming')
    return Skill.objects.create(name='Python', category=cat)


def test_returns_matrix_data(auth_client, skill):
    client, employee = auth_client
    SkillAssignment.objects.create(employee=employee, skill=skill, level=4)

    r = client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data['employees']) >= 1
    assert len(r.data['skills']) == 1
    assert len(r.data['assignments']) == 1
    assert r.data['assignments'][0]['level'] == 4


def test_returns_empty_when_no_data(auth_client):
    client, _ = auth_client
    r = client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert r.data['skills'] == []
    assert r.data['assignments'] == []


def test_filter_by_team(auth_client, skill):
    client, employee = auth_client
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)
    team.members.add(employee)
    outsider = Employee.objects.create(first_name='X', last_name='Y', email='xy@x.com')
    SkillAssignment.objects.create(employee=employee, skill=skill, level=3)
    SkillAssignment.objects.create(employee=outsider, skill=skill, level=2)

    r = client.get(f'{URL}?team={team.id}')
    assert len(r.data['employees']) == 1
    assert r.data['employees'][0]['full_name'] == 'A B'
    assert len(r.data['assignments']) == 1


def test_filter_by_category(auth_client, skill):
    client, employee = auth_client
    cat2 = SkillCategory.objects.create(name='Ops')
    Skill.objects.create(name='Docker', category=cat2)

    r = client.get(f'{URL}?category={skill.category_id}')
    assert len(r.data['skills']) == 1
    assert r.data['skills'][0]['name'] == 'Python'


def test_search_by_name(auth_client, skill):
    client, employee = auth_client
    Employee.objects.create(first_name='Zara', last_name='Z', email='z@x.com')

    r = client.get(f'{URL}?search=zar')
    assert len(r.data['employees']) == 1
    assert r.data['employees'][0]['full_name'] == 'Zara Z'


def test_unauthenticated_rejected():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
