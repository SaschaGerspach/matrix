import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from teams.models import Department, Team


pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/me/'


@pytest.fixture
def user_with_employee(db):
    user = User.objects.create_user(username='emp', password='pw!')
    employee = Employee.objects.create(first_name='Alice', last_name='A', email='alice@x.com', user=user)
    return user, employee


def test_returns_own_employee_profile(user_with_employee):
    user, employee = user_with_employee
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert r.data['id'] == employee.id
    assert r.data['full_name'] == 'Alice A'
    assert r.data['is_team_lead'] is False
    assert r.data['is_admin'] is False


def test_returns_team_lead_flag(user_with_employee):
    user, employee = user_with_employee
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)
    team.team_leads.add(employee)
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.data['is_team_lead'] is True


def test_returns_admin_flag(db):
    user = User.objects.create_user(username='admin', password='pw!', is_staff=True)
    Employee.objects.create(first_name='X', last_name='Y', email='xy@x.com', user=user)
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.data['is_admin'] is True


def test_returns_404_if_no_employee_linked(db):
    user = User.objects.create_user(username='nolink', password='pw!')
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.status_code == status.HTTP_404_NOT_FOUND


def test_unauthenticated_rejected():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
