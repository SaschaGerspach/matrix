import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skill-assignments/'


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
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(username='emp', password='pw!')


@pytest.fixture
def employee(employee_user):
    return Employee.objects.create(first_name='Alice', last_name='A', email='alice@x.com', user=employee_user)


@pytest.fixture
def employee_client(employee_user):
    c = APIClient()
    c.force_authenticate(user=employee_user)
    return c


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
def team_with_lead(team, employee, lead_employee):
    team.members.add(employee)
    team.team_leads.add(lead_employee)
    return team


def test_employee_can_create_own(employee_client, employee, skill):
    r = employee_client.post(URL, {'employee': employee.id, 'skill': skill.id, 'level': 3}, format='json')
    assert r.status_code == status.HTTP_201_CREATED


def test_employee_cannot_create_for_other(employee_client, employee, skill):
    other = Employee.objects.create(first_name='X', last_name='Y', email='xy@x.com')
    r = employee_client.post(URL, {'employee': other.id, 'skill': skill.id, 'level': 2}, format='json')
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_employee_cannot_delete(employee_client, employee, skill):
    sa = SkillAssignment.objects.create(employee=employee, skill=skill, level=2)
    r = employee_client.delete(f'{URL}{sa.id}/')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_lead_can_create_for_team_member(lead_client, team_with_lead, employee, skill):
    r = lead_client.post(URL, {'employee': employee.id, 'skill': skill.id, 'level': 3}, format='json')
    assert r.status_code == status.HTTP_201_CREATED


def test_lead_cannot_create_for_non_member(lead_client, team_with_lead, skill):
    outsider = Employee.objects.create(first_name='Z', last_name='Z', email='zz@x.com')
    r = lead_client.post(URL, {'employee': outsider.id, 'skill': skill.id, 'level': 2}, format='json')
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_admin_can_delete(admin_client, skill):
    emp = Employee.objects.create(first_name='A', last_name='B', email='ab@x.com')
    sa = SkillAssignment.objects.create(employee=emp, skill=skill, level=2)
    r = admin_client.delete(f'{URL}{sa.id}/')
    assert r.status_code == status.HTTP_204_NO_CONTENT


def test_unauthenticated_cannot_list():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_unauthenticated_cannot_create(skill):
    c = APIClient()
    emp = Employee.objects.create(first_name='X', last_name='Y', email='xy2@x.com')
    r = c.post(URL, {'employee': emp.id, 'skill': skill.id, 'level': 2}, format='json')
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_user_without_employee_cannot_create(db, skill):
    user = User.objects.create_user(username='nolink', password='pw!')
    c = APIClient()
    c.force_authenticate(user=user)
    emp = Employee.objects.create(first_name='X', last_name='Y', email='xy3@x.com')
    r = c.post(URL, {'employee': emp.id, 'skill': skill.id, 'level': 2}, format='json')
    assert r.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN)


def test_lead_can_update_team_member(lead_client, team_with_lead, employee, skill):
    sa = SkillAssignment.objects.create(employee=employee, skill=skill, level=2)
    r = lead_client.patch(f'{URL}{sa.id}/', {'level': 4}, format='json')
    assert r.status_code == status.HTTP_200_OK


def test_lead_cannot_delete_team_member(lead_client, team_with_lead, employee, skill):
    sa = SkillAssignment.objects.create(employee=employee, skill=skill, level=2)
    r = lead_client.delete(f'{URL}{sa.id}/')
    assert r.status_code == status.HTTP_403_FORBIDDEN
