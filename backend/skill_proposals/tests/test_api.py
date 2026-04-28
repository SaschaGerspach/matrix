import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skill_proposals.models import SkillProposal
from skills.models import Skill, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skill-proposals/'


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username='admin', password='pw!', is_staff=True)


@pytest.fixture
def admin_client(admin_user):
    c = APIClient()
    c.force_authenticate(user=admin_user)
    return c


@pytest.fixture
def employee(db):
    user = User.objects.create_user(username='emp', password='pw!')
    return Employee.objects.create(
        first_name='Max', last_name='Muster', email='max@example.com', user=user,
    )


@pytest.fixture
def emp_client(employee):
    c = APIClient()
    c.force_authenticate(user=employee.user)
    return c


@pytest.fixture
def category(db):
    return SkillCategory.objects.create(name='Programming')


@pytest.fixture
def proposal(employee, category):
    return SkillProposal.objects.create(
        proposed_by=employee, skill_name='Rust', category=category,
        reason='Need for new microservices',
    )


def test_employee_can_create_proposal(emp_client, employee, category):
    r = emp_client.post(URL, {
        'proposed_by': employee.id, 'skill_name': 'Go',
        'category': category.id, 'reason': 'For backend services',
    }, format='json')
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['status'] == 'pending'


def test_employee_sees_only_own_proposals(emp_client, proposal):
    other_user = User.objects.create_user(username='other', password='pw!')
    other_emp = Employee.objects.create(
        first_name='X', last_name='Y', email='x@y.com', user=other_user,
    )
    SkillProposal.objects.create(proposed_by=other_emp, skill_name='Other')
    r = emp_client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data['results']) == 1
    assert r.data['results'][0]['skill_name'] == 'Rust'


def test_admin_sees_all_proposals(admin_client, proposal):
    r = admin_client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data['results']) >= 1


def test_admin_can_approve(admin_client, proposal, category):
    r = admin_client.post(f'{URL}{proposal.id}/approve/', {
        'review_note': 'Good idea',
    }, format='json')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['status'] == 'approved'
    assert Skill.objects.filter(name='Rust', category=category).exists()


def test_admin_can_reject(admin_client, proposal):
    r = admin_client.post(f'{URL}{proposal.id}/reject/', {
        'review_note': 'Not needed',
    }, format='json')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['status'] == 'rejected'


def test_cannot_review_non_pending(admin_client, proposal):
    proposal.status = SkillProposal.Status.APPROVED
    proposal.save()
    r = admin_client.post(f'{URL}{proposal.id}/reject/', format='json')
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_employee_cannot_approve(emp_client, proposal):
    r = emp_client.post(f'{URL}{proposal.id}/approve/', format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_team_lead_can_approve(db, category):
    lead_user = User.objects.create_user(username='lead', password='pw!')
    lead_emp = Employee.objects.create(
        first_name='Lead', last_name='Person', email='lead@ex.com', user=lead_user,
    )
    member = Employee.objects.create(first_name='M', last_name='M', email='m@ex.com')
    dept = Department.objects.create(name='Dept')
    team = Team.objects.create(name='Team A', department=dept)
    team.team_leads.add(lead_emp)
    team.members.add(member)
    proposal = SkillProposal.objects.create(
        proposed_by=member, skill_name='Kotlin', category=category,
    )
    client = APIClient()
    client.force_authenticate(user=lead_user)
    r = client.post(f'{URL}{proposal.id}/approve/', format='json')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['status'] == 'approved'


def test_filter_by_status(admin_client, proposal):
    r = admin_client.get(f'{URL}?status=pending')
    assert r.status_code == status.HTTP_200_OK
    assert all(p['status'] == 'pending' for p in r.data['results'])


def test_approve_creates_skill_in_catalog(admin_client, proposal, category):
    admin_client.post(f'{URL}{proposal.id}/approve/', format='json')
    assert Skill.objects.filter(name='Rust', category=category).exists()


def test_approve_without_category_skips_skill_creation(admin_client):
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    p = SkillProposal.objects.create(proposed_by=emp, skill_name='Random')
    r = admin_client.post(f'{URL}{p.id}/approve/', format='json')
    assert r.status_code == status.HTTP_200_OK
    assert not Skill.objects.filter(name='Random').exists()


def test_unauthenticated_cannot_access(db):
    c = APIClient()
    r = c.get(URL)
    assert r.status_code == status.HTTP_401_UNAUTHORIZED
