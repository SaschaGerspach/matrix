import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/my-skills/'


@pytest.fixture
def skill(db):
    cat = SkillCategory.objects.create(name='Programming')
    return Skill.objects.create(name='Python', category=cat)


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


def test_returns_own_assignments(employee_client, employee, skill):
    SkillAssignment.objects.create(employee=employee, skill=skill, level=3)
    r = employee_client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 1
    assert r.data[0]['skill_name'] == 'Python'
    assert r.data[0]['category_name'] == 'Programming'
    assert r.data[0]['level'] == 3
    assert r.data[0]['status'] == 'pending'


def test_does_not_return_other_assignments(employee_client, employee, skill):
    other = Employee.objects.create(first_name='X', last_name='Y', email='xy@x.com')
    SkillAssignment.objects.create(employee=other, skill=skill, level=4)
    SkillAssignment.objects.create(employee=employee, skill=skill, level=2)
    r = employee_client.get(URL)
    assert len(r.data) == 1
    assert r.data[0]['level'] == 2


def test_empty_for_user_without_employee(db):
    user = User.objects.create_user(username='nolink', password='pw!')
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 0


def test_unauthenticated_rejected():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
