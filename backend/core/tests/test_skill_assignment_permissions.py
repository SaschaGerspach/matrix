import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Department, Employee, Skill, SkillAssignment, SkillCategory, Team


pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skill-assignments/'


@pytest.fixture
def skill(db):
    cat = SkillCategory.objects.create(name='Programming')
    return Skill.objects.create(name='Python', category=cat)


@pytest.fixture
def department(db):
    return Department.objects.create(name='Engineering')


@pytest.fixture
def team(department):
    return Team.objects.create(name='Core', department=department)


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username='admin', password='pw!', is_staff=True)


@pytest.fixture
def admin_client(admin_user):
    c = APIClient()
    c.force_authenticate(user=admin_user)
    return c


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(username='emp', password='pw!')


@pytest.fixture
def employee(employee_user):
    return Employee.objects.create(
        first_name='Alice', last_name='A', email='alice@x.com', user=employee_user,
    )


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
    return Employee.objects.create(
        first_name='Bob', last_name='B', email='bob@x.com', user=lead_user,
    )


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


# --- Employee: own assignments ---

def test_employee_can_create_own_assignment(employee_client, employee, skill):
    r = employee_client.post(URL, {'employee': employee.id, 'skill': skill.id, 'level': 3}, format='json')
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['status'] == 'pending'


def test_employee_can_update_own_assignment(employee_client, employee, skill):
    sa = SkillAssignment.objects.create(employee=employee, skill=skill, level=2)
    r = employee_client.patch(f'{URL}{sa.id}/', {'level': 4}, format='json')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['level'] == 4


def test_employee_cannot_create_assignment_for_other(employee_client, employee, skill):
    other = Employee.objects.create(first_name='X', last_name='Y', email='xy@x.com')
    r = employee_client.post(URL, {'employee': other.id, 'skill': skill.id, 'level': 2}, format='json')
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_employee_cannot_update_other_assignment(employee_client, skill):
    other = Employee.objects.create(first_name='X', last_name='Y', email='xy@x.com')
    sa = SkillAssignment.objects.create(employee=other, skill=skill, level=2)
    r = employee_client.patch(f'{URL}{sa.id}/', {'level': 4}, format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_employee_cannot_delete(employee_client, employee, skill):
    sa = SkillAssignment.objects.create(employee=employee, skill=skill, level=2)
    r = employee_client.delete(f'{URL}{sa.id}/')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_employee_can_list_assignments(employee_client, employee, skill):
    SkillAssignment.objects.create(employee=employee, skill=skill, level=3)
    r = employee_client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) >= 1


# --- Teamlead: team member assignments ---

def test_lead_can_create_assignment_for_team_member(lead_client, team_with_lead, employee, skill):
    r = lead_client.post(URL, {'employee': employee.id, 'skill': skill.id, 'level': 3}, format='json')
    assert r.status_code == status.HTTP_201_CREATED


def test_lead_can_update_team_member_assignment(lead_client, team_with_lead, employee, skill):
    sa = SkillAssignment.objects.create(employee=employee, skill=skill, level=2)
    r = lead_client.patch(f'{URL}{sa.id}/', {'level': 5}, format='json')
    assert r.status_code == status.HTTP_200_OK


def test_lead_cannot_create_assignment_for_non_member(lead_client, team_with_lead, skill):
    outsider = Employee.objects.create(first_name='Z', last_name='Z', email='zz@x.com')
    r = lead_client.post(URL, {'employee': outsider.id, 'skill': skill.id, 'level': 2}, format='json')
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_lead_cannot_update_non_member_assignment(lead_client, team_with_lead, skill):
    outsider = Employee.objects.create(first_name='Z', last_name='Z', email='zz@x.com')
    sa = SkillAssignment.objects.create(employee=outsider, skill=skill, level=2)
    r = lead_client.patch(f'{URL}{sa.id}/', {'level': 4}, format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_lead_cannot_delete(lead_client, team_with_lead, employee, skill):
    sa = SkillAssignment.objects.create(employee=employee, skill=skill, level=2)
    r = lead_client.delete(f'{URL}{sa.id}/')
    assert r.status_code == status.HTTP_403_FORBIDDEN


# --- Admin: full access ---

def test_admin_can_create_any_assignment(admin_client, skill):
    emp = Employee.objects.create(first_name='A', last_name='B', email='ab@x.com')
    r = admin_client.post(URL, {'employee': emp.id, 'skill': skill.id, 'level': 3}, format='json')
    assert r.status_code == status.HTTP_201_CREATED


def test_admin_can_delete_assignment(admin_client, skill):
    emp = Employee.objects.create(first_name='A', last_name='B', email='ab@x.com')
    sa = SkillAssignment.objects.create(employee=emp, skill=skill, level=2)
    r = admin_client.delete(f'{URL}{sa.id}/')
    assert r.status_code == status.HTTP_204_NO_CONTENT


# --- Unauthenticated ---

def test_anon_cannot_access():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
