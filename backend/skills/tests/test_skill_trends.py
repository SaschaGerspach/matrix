import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillAssignmentHistory, SkillCategory

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skill-trends/'


@pytest.fixture
def setup(db):
    user = User.objects.create_user(username='alice', password='pw!')
    employee = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com', user=user)
    cat = SkillCategory.objects.create(name='Programming')
    python = Skill.objects.create(name='Python', category=cat)
    assignment = SkillAssignment.objects.create(employee=employee, skill=python, level=4)

    SkillAssignmentHistory.objects.create(
        assignment=assignment, employee=employee, skill=python,
        old_level=None, new_level=2, action='created', changed_by=employee,
    )
    SkillAssignmentHistory.objects.create(
        assignment=assignment, employee=employee, skill=python,
        old_level=2, new_level=4, action='updated', changed_by=employee,
    )
    SkillAssignmentHistory.objects.create(
        assignment=assignment, employee=employee, skill=python,
        old_level=4, new_level=4, action='confirmed', changed_by=employee,
    )

    return user, employee, python


def test_returns_trend_data(setup):
    user, employee, python = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL, {'employee': employee.id})
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 1
    assert r.data[0]['skill_name'] == 'Python'
    assert len(r.data[0]['points']) == 2
    assert r.data[0]['points'][0]['level'] == 2
    assert r.data[0]['points'][1]['level'] == 4


def test_empty_without_employee_param(setup):
    user, *_ = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.data == []


def test_unauthenticated():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
