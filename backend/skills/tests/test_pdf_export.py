import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skill-matrix/export-pdf/'


@pytest.fixture
def setup(db):
    user = User.objects.create_user(username='viewer', password='pw!')
    emp = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com')
    cat = SkillCategory.objects.create(name='Programming')
    skill = Skill.objects.create(name='Python', category=cat)
    SkillAssignment.objects.create(employee=emp, skill=skill, level=4)
    return user


def test_returns_pdf(setup):
    c = APIClient()
    c.force_authenticate(user=setup)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert r['Content-Type'] == 'application/pdf'
    assert r['Content-Disposition'] == 'attachment; filename="skill-matrix.pdf"'
    assert r.content[:5] == b'%PDF-'


def test_empty_pdf(db):
    user = User.objects.create_user(username='empty', password='pw!')
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert r.content[:5] == b'%PDF-'


def test_unauthenticated():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
