import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/kpi/'


@pytest.fixture
def setup(db):
    user = User.objects.create_user(username='viewer', password='pw!')
    emp1 = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com')
    emp2 = Employee.objects.create(first_name='Bob', last_name='B', email='b@x.com')

    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Alpha', department=dept)
    team.members.add(emp1, emp2)

    cat = SkillCategory.objects.create(name='Programming')
    python = Skill.objects.create(name='Python', category=cat)
    docker = Skill.objects.create(name='Docker', category=cat)

    SkillAssignment.objects.create(employee=emp1, skill=python, level=4, status='confirmed')
    SkillAssignment.objects.create(employee=emp2, skill=docker, level=2, status='pending')

    return user


def test_returns_kpi(setup):
    c = APIClient()
    c.force_authenticate(user=setup)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) >= 1
    alpha = next(t for t in r.data if t['team_name'] == 'Alpha')
    assert alpha['member_count'] == 2
    assert alpha['avg_level'] == 3.0
    assert alpha['coverage'] == 100.0
    assert alpha['total_assignments'] == 2
    assert alpha['confirmed_ratio'] == 50.0


def test_empty_team(db):
    user = User.objects.create_user(username='viewer', password='pw!')
    dept = Department.objects.create(name='Eng')
    Team.objects.create(name='Empty', department=dept)
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    empty = next(t for t in r.data if t['team_name'] == 'Empty')
    assert empty['member_count'] == 0
    assert empty['avg_level'] == 0


def test_unauthenticated():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


DIST_URL = '/api/kpi/level-distribution/'


def test_level_distribution(setup):
    c = APIClient()
    c.force_authenticate(user=setup)
    r = c.get(DIST_URL)
    assert r.status_code == status.HTTP_200_OK
    assert 'overall' in r.data
    assert 'teams' in r.data
    overall = r.data['overall']
    assert overall['2'] == 1
    assert overall['4'] == 1
    assert overall['1'] == 0
    alpha = next(t for t in r.data['teams'] if t['team_name'] == 'Alpha')
    assert alpha['distribution']['4'] == 1
    assert alpha['distribution']['2'] == 1


def test_level_distribution_empty_team(db):
    user = User.objects.create_user(username='viewer', password='pw!')
    dept = Department.objects.create(name='Eng')
    Team.objects.create(name='Empty', department=dept)
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(DIST_URL)
    empty = next(t for t in r.data['teams'] if t['team_name'] == 'Empty')
    assert empty['distribution'] == {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}


def test_level_distribution_unauthenticated():
    c = APIClient()
    r = c.get(DIST_URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
