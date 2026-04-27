import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def setup(db):
    user = User.objects.create_user(username='viewer', password='pw!')
    employee = Employee.objects.create(first_name='Alice', last_name='A', email='alice@x.com', user=user)
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)
    team.members.add(employee)
    cat = SkillCategory.objects.create(name='Programming')
    skill = Skill.objects.create(name='Python', category=cat)
    assignment = SkillAssignment.objects.create(employee=employee, skill=skill, level=4)
    return user, employee, team, skill, assignment


def test_profile_returns_employee_details(setup):
    user, employee, team, skill, assignment = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(f'/api/employees/{employee.id}/profile/')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['full_name'] == 'Alice A'
    assert r.data['email'] == 'alice@x.com'


def test_profile_includes_teams(setup):
    user, employee, team, skill, assignment = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(f'/api/employees/{employee.id}/profile/')
    assert len(r.data['teams']) == 1
    assert r.data['teams'][0]['name'] == 'Core'


def test_profile_includes_skills(setup):
    user, employee, team, skill, assignment = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(f'/api/employees/{employee.id}/profile/')
    assert len(r.data['skills']) == 1
    assert r.data['skills'][0]['skill_name'] == 'Python'
    assert r.data['skills'][0]['category_name'] == 'Programming'
    assert r.data['skills'][0]['level'] == 4


def test_profile_unauthenticated(setup):
    _, employee, *_ = setup
    c = APIClient()
    r = c.get(f'/api/employees/{employee.id}/profile/')
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
