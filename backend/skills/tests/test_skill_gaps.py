import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory, SkillRequirement
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skill-gaps/'


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


def test_returns_gap_when_below_required(lead_client, team_with_lead, member, skill):
    SkillRequirement.objects.create(team=team_with_lead, skill=skill, required_level=4)
    SkillAssignment.objects.create(employee=member, skill=skill, level=2)

    r = lead_client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 1
    assert r.data[0]['employee_name'] == 'Alice A'
    assert r.data[0]['required_level'] == 4
    assert r.data[0]['actual_level'] == 2
    assert r.data[0]['gap'] == 2


def test_no_gap_when_meets_requirement(lead_client, team_with_lead, member, skill):
    SkillRequirement.objects.create(team=team_with_lead, skill=skill, required_level=3)
    SkillAssignment.objects.create(employee=member, skill=skill, level=3)

    r = lead_client.get(URL)
    assert len(r.data) == 0


def test_gap_when_no_assignment(lead_client, team_with_lead, member, skill):
    SkillRequirement.objects.create(team=team_with_lead, skill=skill, required_level=2)

    r = lead_client.get(URL)
    assert len(r.data) == 1
    assert r.data[0]['actual_level'] == 0
    assert r.data[0]['gap'] == 2


def test_non_lead_gets_empty(db, skill):
    user = User.objects.create_user(username='regular', password='pw!')
    Employee.objects.create(first_name='X', last_name='Y', email='xy@x.com', user=user)
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 0


def test_admin_sees_all_gaps(db, skill):
    admin_user = User.objects.create_user(username='admin', password='pw!', is_staff=True)
    Employee.objects.create(first_name='Admin', last_name='A', email='admin@x.com', user=admin_user)

    dept = Department.objects.create(name='Sales')
    team = Team.objects.create(name='Frontend', department=dept)
    member = Employee.objects.create(first_name='Carol', last_name='C', email='carol@x.com')
    team.members.add(member)
    SkillRequirement.objects.create(team=team, skill=skill, required_level=3)

    c = APIClient()
    c.force_authenticate(user=admin_user)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 1
    assert r.data[0]['employee_name'] == 'Carol C'
    assert r.data[0]['gap'] == 3


def test_admin_without_employee_sees_all_gaps(db, skill):
    admin_user = User.objects.create_user(username='admin2', password='pw!', is_staff=True)

    dept = Department.objects.create(name='Sales')
    team = Team.objects.create(name='Frontend', department=dept)
    member = Employee.objects.create(first_name='Dave', last_name='D', email='dave@x.com')
    team.members.add(member)
    SkillRequirement.objects.create(team=team, skill=skill, required_level=2)

    c = APIClient()
    c.force_authenticate(user=admin_user)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 1


def test_unauthenticated_rejected():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
