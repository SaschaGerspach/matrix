import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/team-comparison/'


@pytest.fixture
def setup(db):
    user = User.objects.create_user(username='viewer', password='pw!', is_staff=True)
    dept = Department.objects.create(name='Eng')

    team_a = Team.objects.create(name='Alpha', department=dept)
    team_b = Team.objects.create(name='Beta', department=dept)

    emp1 = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com')
    emp2 = Employee.objects.create(first_name='Bob', last_name='B', email='b@x.com')
    emp3 = Employee.objects.create(first_name='Carol', last_name='C', email='c@x.com')

    team_a.members.add(emp1, emp2)
    team_b.members.add(emp3)

    cat = SkillCategory.objects.create(name='Programming')
    python = Skill.objects.create(name='Python', category=cat)
    docker = Skill.objects.create(name='Docker', category=cat)

    SkillAssignment.objects.create(employee=emp1, skill=python, level=4)
    SkillAssignment.objects.create(employee=emp2, skill=python, level=2)
    SkillAssignment.objects.create(employee=emp3, skill=python, level=5)
    SkillAssignment.objects.create(employee=emp1, skill=docker, level=3)

    return user, team_a, team_b, python, docker


def test_compares_teams(setup):
    user, team_a, team_b, python, docker = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL, {'teams': [team_a.id, team_b.id]})
    assert r.status_code == status.HTTP_200_OK

    data = {entry['skill_name']: entry for entry in r.data}

    assert data['Python']['teams']['Alpha'] == 3.0
    assert data['Python']['teams']['Beta'] == 5.0

    assert data['Docker']['teams']['Alpha'] == 1.5
    assert data['Docker']['teams']['Beta'] == 0


def test_empty_when_no_teams_param(setup):
    user, *_ = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert r.data == []


def test_unauthenticated():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
