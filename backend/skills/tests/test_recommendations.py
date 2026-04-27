import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory, SkillRequirement
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skill-recommendations/'


@pytest.fixture
def setup(db):
    user = User.objects.create_user(username='dev', password='pw!')
    emp = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com', user=user)

    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Alpha', department=dept)
    team.members.add(emp)

    cat = SkillCategory.objects.create(name='Programming')
    python = Skill.objects.create(name='Python', category=cat)
    docker = Skill.objects.create(name='Docker', category=cat)
    go = Skill.objects.create(name='Go', category=cat)

    SkillRequirement.objects.create(team=team, skill=python, required_level=4)
    SkillRequirement.objects.create(team=team, skill=docker, required_level=3)
    SkillRequirement.objects.create(team=team, skill=go, required_level=2)

    SkillAssignment.objects.create(employee=emp, skill=python, level=2)
    SkillAssignment.objects.create(employee=emp, skill=go, level=3)

    return user, emp


def test_returns_recommendations(setup):
    user, _ = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    names = [rec['skill_name'] for rec in r.data]
    assert 'Docker' in names
    assert 'Python' in names
    assert 'Go' not in names


def test_sorted_by_gap_descending(setup):
    user, _ = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    gaps = [rec['gap'] for rec in r.data]
    assert gaps == sorted(gaps, reverse=True)


def test_includes_priority(setup):
    user, _ = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    for rec in r.data:
        assert rec['priority'] in ('high', 'medium', 'low')


def test_empty_when_no_requirements(db):
    user = User.objects.create_user(username='loner', password='pw!')
    Employee.objects.create(first_name='Bob', last_name='B', email='b@x.com', user=user)
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert r.data == []


def test_unauthenticated():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
