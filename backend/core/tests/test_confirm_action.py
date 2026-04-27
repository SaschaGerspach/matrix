import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Department, Employee, Skill, SkillAssignment, SkillCategory, Team


pytestmark = pytest.mark.django_db

User = get_user_model()


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


@pytest.fixture
def pending_assignment(employee, skill):
    return SkillAssignment.objects.create(employee=employee, skill=skill, level=3)


def confirm_url(assignment_id):
    return f'/api/skill-assignments/{assignment_id}/confirm/'


def test_lead_can_confirm_team_member_assignment(lead_client, lead_employee, team_with_lead, pending_assignment):
    r = lead_client.post(confirm_url(pending_assignment.id))
    assert r.status_code == status.HTTP_200_OK
    assert r.data['status'] == 'confirmed'
    assert r.data['confirmed_by'] == lead_employee.id
    assert r.data['confirmed_at'] is not None


def test_admin_can_confirm_any_assignment(admin_client, pending_assignment):
    r = admin_client.post(confirm_url(pending_assignment.id))
    assert r.status_code == status.HTTP_200_OK
    assert r.data['status'] == 'confirmed'


def test_employee_cannot_confirm_own_assignment(employee_client, employee, pending_assignment):
    r = employee_client.post(confirm_url(pending_assignment.id))
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_lead_cannot_confirm_non_member_assignment(lead_client, lead_employee, team, skill):
    team.team_leads.add(lead_employee)
    outsider = Employee.objects.create(first_name='Z', last_name='Z', email='zz@x.com')
    sa = SkillAssignment.objects.create(employee=outsider, skill=skill, level=2)
    r = lead_client.post(confirm_url(sa.id))
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_confirm_already_confirmed_returns_400(admin_client, pending_assignment):
    pending_assignment.status = SkillAssignment.Status.CONFIRMED
    pending_assignment.save()
    r = admin_client.post(confirm_url(pending_assignment.id))
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_anon_cannot_confirm(pending_assignment):
    c = APIClient()
    r = c.post(confirm_url(pending_assignment.id))
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
