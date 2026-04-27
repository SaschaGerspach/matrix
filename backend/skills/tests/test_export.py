import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory


pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skill-matrix/export/'


@pytest.fixture
def auth_client(db):
    user = User.objects.create_user(username='u', password='pw!')
    Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com', user=user)
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def skill(db):
    cat = SkillCategory.objects.create(name='Programming')
    return Skill.objects.create(name='Python', category=cat)


def test_returns_csv(auth_client, skill):
    emp = Employee.objects.first()
    SkillAssignment.objects.create(employee=emp, skill=skill, level=4)

    r = auth_client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert r['Content-Type'] == 'text/csv'
    assert 'skill-matrix.csv' in r['Content-Disposition']

    content = r.content.decode('utf-8')
    lines = content.strip().split('\r\n')
    assert lines[0] == 'Employee,Python'
    assert 'Alice A' in lines[1]
    assert '4' in lines[1]


def test_empty_csv(auth_client):
    r = auth_client.get(URL)
    assert r.status_code == status.HTTP_200_OK
    content = r.content.decode('utf-8')
    lines = content.strip().split('\r\n')
    assert lines[0] == 'Employee'


def test_unauthenticated_rejected():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
