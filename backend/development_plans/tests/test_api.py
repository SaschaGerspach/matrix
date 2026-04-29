import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from development_plans.models import DevelopmentGoal, DevelopmentPlan
from employees.models import Employee
from skills.models import Skill, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()
PLANS_URL = '/api/development-plans/'
GOALS_URL = '/api/development-goals/'


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
def skill(db):
    cat = SkillCategory.objects.create(name='Programming')
    return Skill.objects.create(name='Python', category=cat)


@pytest.fixture
def plan(employee):
    return DevelopmentPlan.objects.create(
        employee=employee, title='Q3 Growth Plan',
    )


def test_admin_can_create_plan(admin_client):
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    r = admin_client.post(PLANS_URL, {
        'employee': emp.id, 'title': 'Growth Plan',
    }, format='json')
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['title'] == 'Growth Plan'


def test_plan_includes_goals(admin_client, plan, skill):
    DevelopmentGoal.objects.create(
        plan=plan, skill=skill, current_level=2, target_level=4,
    )
    r = admin_client.get(f'{PLANS_URL}{plan.id}/')
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data['goals']) == 1
    assert r.data['goals'][0]['skill_name'] == 'Python'


def test_filter_plans_by_employee(admin_client, plan, employee):
    other = Employee.objects.create(first_name='X', last_name='Y', email='x@y.com')
    DevelopmentPlan.objects.create(employee=other, title='Other Plan')
    r = admin_client.get(f'{PLANS_URL}?employee={employee.id}')
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data['results']) == 1


def test_add_goal_to_plan(admin_client, plan, skill):
    r = admin_client.post(GOALS_URL, {
        'plan': plan.id, 'skill': skill.id,
        'current_level': 2, 'target_level': 4,
    }, format='json')
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['status'] == 'open'


def test_goal_target_must_exceed_current(admin_client, plan, skill):
    r = admin_client.post(GOALS_URL, {
        'plan': plan.id, 'skill': skill.id,
        'current_level': 3, 'target_level': 2,
    }, format='json')
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_goal_level_validation(admin_client, plan, skill):
    r = admin_client.post(GOALS_URL, {
        'plan': plan.id, 'skill': skill.id,
        'current_level': 0, 'target_level': 3,
    }, format='json')
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_update_goal_status(admin_client, plan, skill):
    goal = DevelopmentGoal.objects.create(
        plan=plan, skill=skill, current_level=2, target_level=4,
    )
    r = admin_client.patch(f'{GOALS_URL}{goal.id}/', {
        'status': 'in_progress',
    }, format='json')
    assert r.status_code == status.HTTP_200_OK
    goal.refresh_from_db()
    assert goal.status == 'in_progress'


def test_employee_can_view_own_plan(emp_client, plan):
    r = emp_client.get(f'{PLANS_URL}{plan.id}/')
    assert r.status_code == status.HTTP_200_OK


def test_employee_can_update_own_plan(emp_client, plan):
    r = emp_client.patch(f'{PLANS_URL}{plan.id}/', {'title': 'Updated'}, format='json')
    assert r.status_code == status.HTTP_200_OK


def test_employee_cannot_modify_other_plan(emp_client):
    other = Employee.objects.create(first_name='X', last_name='Y', email='x@y.com')
    other_plan = DevelopmentPlan.objects.create(employee=other, title='Not mine')
    r = emp_client.patch(f'{PLANS_URL}{other_plan.id}/', {'title': 'Hacked'}, format='json')
    assert r.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)


def test_team_lead_can_modify_member_plan(db, skill):
    lead_user = User.objects.create_user(username='lead', password='pw!')
    lead_emp = Employee.objects.create(
        first_name='Lead', last_name='Person', email='lead@ex.com', user=lead_user,
    )
    member = Employee.objects.create(first_name='Member', last_name='One', email='m@ex.com')
    dept = Department.objects.create(name='Dept')
    team = Team.objects.create(name='Team A', department=dept)
    team.team_leads.add(lead_emp)
    team.members.add(member)
    plan = DevelopmentPlan.objects.create(employee=member, title='Member Plan')

    client = APIClient()
    client.force_authenticate(user=lead_user)
    r = client.patch(f'{PLANS_URL}{plan.id}/', {'notes': 'Updated by lead'}, format='json')
    assert r.status_code == status.HTTP_200_OK


def test_delete_plan(admin_client, plan):
    r = admin_client.delete(f'{PLANS_URL}{plan.id}/')
    assert r.status_code == status.HTTP_204_NO_CONTENT
    assert not DevelopmentPlan.objects.filter(id=plan.id).exists()


def test_unauthenticated_cannot_access(db):
    c = APIClient()
    r = c.get(PLANS_URL)
    assert r.status_code == status.HTTP_401_UNAUTHORIZED
