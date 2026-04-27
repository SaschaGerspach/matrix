import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillAssignmentHistory, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def setup(db):
    user = User.objects.create_user(username='alice', password='pw!')
    employee = Employee.objects.create(first_name='Alice', last_name='A', email='alice@x.com', user=user)
    cat = SkillCategory.objects.create(name='Programming')
    skill = Skill.objects.create(name='Python', category=cat)
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)
    team.members.add(employee)

    lead_user = User.objects.create_user(username='lead', password='pw!')
    lead = Employee.objects.create(first_name='Lead', last_name='L', email='lead@x.com', user=lead_user)
    team.team_leads.add(lead)
    team.members.add(lead)

    return user, employee, lead_user, lead, skill


def test_create_logs_history(setup):
    user, employee, _, _, skill = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.post('/api/skill-assignments/', {'employee': employee.id, 'skill': skill.id, 'level': 3})
    assert r.status_code == status.HTTP_201_CREATED

    entries = SkillAssignmentHistory.objects.filter(employee=employee)
    assert entries.count() == 1
    entry = entries.first()
    assert entry.action == 'created'
    assert entry.old_level is None
    assert entry.new_level == 3
    assert entry.changed_by == employee


def test_update_logs_history(setup):
    user, employee, _, _, skill = setup
    assignment = SkillAssignment.objects.create(employee=employee, skill=skill, level=2)
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.patch(f'/api/skill-assignments/{assignment.id}/', {'level': 4})
    assert r.status_code == status.HTTP_200_OK

    entries = SkillAssignmentHistory.objects.filter(employee=employee)
    assert entries.count() == 1
    entry = entries.first()
    assert entry.action == 'updated'
    assert entry.old_level == 2
    assert entry.new_level == 4


def test_update_same_level_no_history(setup):
    user, employee, _, _, skill = setup
    assignment = SkillAssignment.objects.create(employee=employee, skill=skill, level=3)
    c = APIClient()
    c.force_authenticate(user=user)
    c.patch(f'/api/skill-assignments/{assignment.id}/', {'level': 3})
    assert SkillAssignmentHistory.objects.filter(employee=employee).count() == 0


def test_confirm_logs_history(setup):
    _, employee, lead_user, lead, skill = setup
    assignment = SkillAssignment.objects.create(employee=employee, skill=skill, level=3)
    c = APIClient()
    c.force_authenticate(user=lead_user)
    r = c.post(f'/api/skill-assignments/{assignment.id}/confirm/')
    assert r.status_code == status.HTTP_200_OK

    entries = SkillAssignmentHistory.objects.filter(employee=employee)
    assert entries.count() == 1
    entry = entries.first()
    assert entry.action == 'confirmed'
    assert entry.changed_by == lead


def test_delete_logs_history(setup):
    user, employee, _, _, skill = setup
    admin_user = User.objects.create_user(username='admin', password='pw!', is_staff=True)
    Employee.objects.create(first_name='Admin', last_name='A', email='admin@x.com', user=admin_user)
    assignment = SkillAssignment.objects.create(employee=employee, skill=skill, level=2)
    c = APIClient()
    c.force_authenticate(user=admin_user)
    r = c.delete(f'/api/skill-assignments/{assignment.id}/')
    assert r.status_code == status.HTTP_204_NO_CONTENT

    entries = SkillAssignmentHistory.objects.filter(employee=employee)
    assert entries.count() == 1
    entry = entries.first()
    assert entry.action == 'deleted'
    assert entry.old_level == 2
    assert entry.new_level is None
    assert entry.assignment is None


def test_history_endpoint_returns_entries(setup):
    user, employee, _, _, skill = setup
    assignment = SkillAssignment.objects.create(employee=employee, skill=skill, level=3)
    SkillAssignmentHistory.objects.create(
        assignment=assignment, employee=employee, skill=skill,
        old_level=None, new_level=3, action='created', changed_by=employee,
    )
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get('/api/skill-history/')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['count'] == 1
    assert r.data['results'][0]['action'] == 'created'


def test_history_endpoint_filter_by_employee(setup):
    user, employee, lead_user, lead, skill = setup
    SkillAssignmentHistory.objects.create(
        employee=employee, skill=skill, old_level=None, new_level=3,
        action='created', changed_by=employee,
    )
    SkillAssignmentHistory.objects.create(
        employee=lead, skill=skill, old_level=None, new_level=2,
        action='created', changed_by=lead,
    )
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(f'/api/skill-history/?employee={employee.id}')
    assert r.data['count'] == 1
    assert r.data['results'][0]['employee'] == employee.id


def test_history_endpoint_unauthenticated():
    c = APIClient()
    r = c.get('/api/skill-history/')
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
