import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from employees.models import Employee
from notifications.models import Notification
from skills.models import Skill, SkillAssignment, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def setup(db):
    lead_user = User.objects.create_user(username='lead', password='pw!')
    lead = Employee.objects.create(first_name='Lead', last_name='L', email='lead@x.com', user=lead_user)

    emp_user = User.objects.create_user(username='dev', password='pw!')
    emp = Employee.objects.create(first_name='Dev', last_name='D', email='dev@x.com', user=emp_user)

    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Alpha', department=dept)
    team.members.add(emp)
    team.team_leads.add(lead)

    cat = SkillCategory.objects.create(name='Programming')
    skill = Skill.objects.create(name='Python', category=cat)

    return lead_user, lead, emp_user, emp, skill


def test_create_assignment_notifies_lead(setup):
    _, lead, emp_user, emp, skill = setup
    c = APIClient()
    c.force_authenticate(user=emp_user)
    r = c.post('/api/skill-assignments/', {'skill': skill.id, 'level': 3, 'employee': emp.id})
    assert r.status_code == 201

    notifications = Notification.objects.filter(recipient=lead)
    assert notifications.count() == 1
    assert notifications[0].type == Notification.Type.SKILL_PENDING
    assert 'Python' in notifications[0].message


def test_confirm_assignment_notifies_employee(setup):
    lead_user, lead, _, emp, skill = setup
    assignment = SkillAssignment.objects.create(employee=emp, skill=skill, level=3)

    c = APIClient()
    c.force_authenticate(user=lead_user)
    r = c.post(f'/api/skill-assignments/{assignment.id}/confirm/')
    assert r.status_code == 200

    notifications = Notification.objects.filter(recipient=emp)
    assert notifications.count() == 1
    assert notifications[0].type == Notification.Type.SKILL_CONFIRMED


def test_update_by_lead_notifies_employee(setup):
    lead_user, _, _, emp, skill = setup
    assignment = SkillAssignment.objects.create(employee=emp, skill=skill, level=3)

    c = APIClient()
    c.force_authenticate(user=lead_user)
    r = c.patch(f'/api/skill-assignments/{assignment.id}/', {'level': 5})
    assert r.status_code == 200

    notifications = Notification.objects.filter(recipient=emp, type=Notification.Type.SKILL_UPDATED)
    assert notifications.count() == 1
    assert 'level 3 to 5' in notifications[0].message


def test_self_update_does_not_notify(setup):
    _, _, emp_user, emp, skill = setup
    assignment = SkillAssignment.objects.create(employee=emp, skill=skill, level=3)

    c = APIClient()
    c.force_authenticate(user=emp_user)
    c.patch(f'/api/skill-assignments/{assignment.id}/', {'level': 4})

    notifications = Notification.objects.filter(recipient=emp, type=Notification.Type.SKILL_UPDATED)
    assert notifications.count() == 0
