import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillCategory, SkillRequirement
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skill-requirements/'


@pytest.fixture
def skill(db):
    cat = SkillCategory.objects.create(name='Programming')
    return Skill.objects.create(name='Python', category=cat)


@pytest.fixture
def team(db):
    dept = Department.objects.create(name='Eng')
    return Team.objects.create(name='Core', department=dept)


@pytest.fixture
def admin_client(db):
    user = User.objects.create_user(username='admin', password='pw!', is_staff=True)
    Employee.objects.create(first_name='Admin', last_name='A', email='admin@x.com', user=user)
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def auth_client(db):
    user = User.objects.create_user(username='user', password='pw!')
    Employee.objects.create(first_name='U', last_name='U', email='u@x.com', user=user)
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def test_admin_can_create(admin_client, team, skill):
    r = admin_client.post(URL, {'team': team.id, 'skill': skill.id, 'required_level': 3})
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['required_level'] == 3


def test_admin_can_list(admin_client, team, skill):
    SkillRequirement.objects.create(team=team, skill=skill, required_level=4)
    r = admin_client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 1
    assert r.data[0]['skill_name'] == 'Python'
    assert r.data[0]['team_name'] == 'Core'


def test_non_admin_cannot_create(auth_client, team, skill):
    r = auth_client.post(URL, {'team': team.id, 'skill': skill.id, 'required_level': 3})
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_non_admin_can_read(auth_client, team, skill):
    SkillRequirement.objects.create(team=team, skill=skill, required_level=4)
    r = auth_client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 1


def test_unauthenticated_rejected():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
