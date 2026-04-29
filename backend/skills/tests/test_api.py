import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username='admin', password='pw!', is_staff=True)


@pytest.fixture
def admin_client(admin_user):
    c = APIClient()
    c.force_authenticate(user=admin_user)
    return c


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(username='user', password='pw!')


@pytest.fixture
def regular_client(regular_user):
    c = APIClient()
    c.force_authenticate(user=regular_user)
    return c


@pytest.fixture
def skill(db):
    cat = SkillCategory.objects.create(name='Programming')
    return Skill.objects.create(name='Python', category=cat)


def test_admin_can_create_skill_category(admin_client):
    r = admin_client.post('/api/skill-categories/', {'name': 'Programming'}, format='json')
    assert r.status_code == status.HTTP_201_CREATED


def test_admin_can_create_skill(admin_client):
    cat = SkillCategory.objects.create(name='Programming')
    r = admin_client.post('/api/skills/', {'name': 'Python', 'category': cat.id}, format='json')
    assert r.status_code == status.HTTP_201_CREATED


def test_regular_user_can_list_but_not_create_skills(regular_client):
    r = regular_client.get('/api/skills/')
    assert r.status_code == status.HTTP_200_OK

    cat = SkillCategory.objects.create(name='P')
    r = regular_client.post('/api/skills/', {'name': 'X', 'category': cat.id}, format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_skill_assignment_level_validation(admin_client, skill):
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    for bad_level in [0, 6, -1, 99]:
        r = admin_client.post(
            '/api/skill-assignments/',
            {'employee': emp.id, 'skill': skill.id, 'level': bad_level},
            format='json',
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_skill_assignment_read_only_fields_ignored(admin_client, skill):
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    r = admin_client.post(
        '/api/skill-assignments/',
        {'employee': emp.id, 'skill': skill.id, 'level': 3, 'status': 'confirmed', 'confirmed_by': emp.id},
        format='json',
    )
    assert r.status_code == status.HTTP_201_CREATED
    sa = SkillAssignment.objects.get(pk=r.data['id'])
    assert sa.status == SkillAssignment.Status.PENDING
    assert sa.confirmed_by is None
