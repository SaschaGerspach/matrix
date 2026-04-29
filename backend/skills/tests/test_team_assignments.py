import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/team-assignments/'


@pytest.fixture
def skill(db):
    cat = SkillCategory.objects.create(name='Programming')
    return Skill.objects.create(name='Python', category=cat)


@pytest.fixture
def team(db):
    dept = Department.objects.create(name='Eng')
    return Team.objects.create(name='Core', department=dept)


@pytest.fixture
def lead_user(db):
    return User.objects.create_user(username='lead', password='pw!')


@pytest.fixture
def lead_employee(lead_user):
    return Employee.objects.create(first_name='Bob', last_name='B', email='bob@x.com', user=lead_user)


@pytest.fixture
def lead_client(lead_user):
    c = APIClient()
    c.force_authenticate(user=lead_user)
    return c


@pytest.fixture
def member(db):
    return Employee.objects.create(first_name='Alice', last_name='A', email='alice@x.com')


@pytest.fixture
def team_with_lead(team, member, lead_employee):
    team.members.add(member)
    team.team_leads.add(lead_employee)
    return team


def test_lead_sees_team_member_assignments(lead_client, team_with_lead, member, skill):
    SkillAssignment.objects.create(employee=member, skill=skill, level=3)
    r = lead_client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 1
    assert r.data[0]['employee_name'] == 'Alice A'
    assert r.data[0]['skill_name'] == 'Python'


def test_lead_can_filter_by_status(lead_client, team_with_lead, member, skill):
    SkillAssignment.objects.create(employee=member, skill=skill, level=3, status='pending')
    cat2 = SkillCategory.objects.create(name='Ops')
    skill2 = Skill.objects.create(name='Docker', category=cat2)
    SkillAssignment.objects.create(employee=member, skill=skill2, level=2, status='confirmed')

    r = lead_client.get(f'{URL}?status=pending')
    assert len(r.data) == 1
    assert r.data[0]['status'] == 'pending'


def test_non_lead_gets_empty(db, skill):
    user = User.objects.create_user(username='regular', password='pw!')
    Employee.objects.create(first_name='X', last_name='Y', email='xy@x.com', user=user)
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 0


def test_lead_does_not_see_outsider_assignments(lead_client, team_with_lead, skill):
    outsider = Employee.objects.create(first_name='Z', last_name='Z', email='zz@x.com')
    SkillAssignment.objects.create(employee=outsider, skill=skill, level=4)
    r = lead_client.get(URL)
    assert len(r.data) == 0


def test_unauthenticated_rejected():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
