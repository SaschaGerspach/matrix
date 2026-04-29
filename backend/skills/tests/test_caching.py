import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory
from skills.views._cache import _cache_key, _register_cache_key, invalidate_analytics_cache
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

MATRIX_URL = '/api/skill-matrix/'
KPI_URL = '/api/kpi/'
LEVEL_DIST_URL = '/api/kpi/level-distribution/'
ASSIGNMENTS_URL = '/api/skill-assignments/'


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username='cacheuser', password='pw12345!', is_staff=True)


@pytest.fixture
def setup_data(user):
    emp = Employee.objects.create(first_name='Cache', last_name='Test', email='cache@test.com', user=user)
    cat = SkillCategory.objects.create(name='TestCat')
    skill = Skill.objects.create(name='TestSkill', category=cat)
    dept = Department.objects.create(name='TestDept')
    team = Team.objects.create(name='TestTeam', department=dept)
    team.members.add(emp)
    return emp, skill, team


def test_matrix_response_is_cached(user, setup_data):
    client = APIClient()
    client.force_authenticate(user=user)

    response1 = client.get(MATRIX_URL)
    assert response1.status_code == status.HTTP_200_OK

    key = _cache_key('matrix', team='', category='', search='')
    assert cache.get(key) is not None


def test_matrix_cache_varies_by_params(user, setup_data):
    client = APIClient()
    client.force_authenticate(user=user)

    client.get(MATRIX_URL)
    client.get(f'{MATRIX_URL}?team=1')

    key_no_filter = _cache_key('matrix', team='', category='', search='')
    key_team = _cache_key('matrix', team='1', category='', search='')

    assert cache.get(key_no_filter) is not None
    assert cache.get(key_team) is not None
    assert key_no_filter != key_team


def test_kpi_response_is_cached(user, setup_data):
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(KPI_URL)
    assert response.status_code == status.HTTP_200_OK

    key = _cache_key('kpi')
    assert cache.get(key) is not None


def test_level_distribution_is_cached(user, setup_data):
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(LEVEL_DIST_URL)
    assert response.status_code == status.HTTP_200_OK

    key = _cache_key('level_distribution')
    assert cache.get(key) is not None


def test_cache_invalidated_on_assignment_create(user, setup_data):
    emp, skill, _ = setup_data
    client = APIClient()
    client.force_authenticate(user=user)

    client.get(MATRIX_URL)
    key = _cache_key('matrix', team='', category='', search='')
    assert cache.get(key) is not None

    client.post(ASSIGNMENTS_URL, {'skill': skill.id, 'level': 3, 'employee': emp.id}, format='json')

    assert cache.get(key) is None


def test_cache_invalidated_on_assignment_update(user, setup_data):
    emp, skill, _ = setup_data
    assignment = SkillAssignment.objects.create(employee=emp, skill=skill, level=2)
    client = APIClient()
    client.force_authenticate(user=user)

    client.get(KPI_URL)
    key = _cache_key('kpi')
    assert cache.get(key) is not None

    client.patch(f'{ASSIGNMENTS_URL}{assignment.id}/', {'level': 4}, format='json')

    assert cache.get(key) is None


def test_cache_invalidated_on_assignment_delete(user, setup_data):
    emp, skill, _ = setup_data
    assignment = SkillAssignment.objects.create(employee=emp, skill=skill, level=3)
    client = APIClient()
    client.force_authenticate(user=user)

    client.get(MATRIX_URL)
    key = _cache_key('matrix', team='', category='', search='')
    assert cache.get(key) is not None

    client.delete(f'{ASSIGNMENTS_URL}{assignment.id}/')

    assert cache.get(key) is None


def test_invalidate_analytics_cache_clears_all_keys():
    k1 = _cache_key('matrix', team='', category='', search='')
    k2 = _cache_key('kpi')
    k3 = _cache_key('level_distribution')
    cache.set(k1, 'data1')
    cache.set(k2, 'data2')
    cache.set(k3, 'data3')
    _register_cache_key(k1)
    _register_cache_key(k2)
    _register_cache_key(k3)

    invalidate_analytics_cache()

    assert cache.get(k1) is None
    assert cache.get(k2) is None
    assert cache.get(k3) is None


def test_second_request_uses_cache(user, setup_data):
    client = APIClient()
    client.force_authenticate(user=user)

    response1 = client.get(MATRIX_URL)
    response2 = client.get(MATRIX_URL)

    assert response1.data == response2.data


def test_cache_invalidated_on_skill_create(user, setup_data):
    _, _, _ = setup_data
    client = APIClient()
    client.force_authenticate(user=user)

    client.get(MATRIX_URL)
    key = _cache_key('matrix', team='', category='', search='')
    assert cache.get(key) is not None

    cat = SkillCategory.objects.first()
    client.post('/api/skills/', {'name': 'NewSkill', 'category': cat.id}, format='json')

    assert cache.get(key) is None


def test_cache_invalidated_on_skill_delete(user, setup_data):
    _, skill, _ = setup_data
    client = APIClient()
    client.force_authenticate(user=user)

    client.get(KPI_URL)
    key = _cache_key('kpi')
    assert cache.get(key) is not None

    client.delete(f'/api/skills/{skill.id}/')

    assert cache.get(key) is None


def test_cache_invalidated_on_category_create(user, setup_data):
    client = APIClient()
    client.force_authenticate(user=user)

    client.get(MATRIX_URL)
    key = _cache_key('matrix', team='', category='', search='')
    assert cache.get(key) is not None

    client.post('/api/skill-categories/', {'name': 'NewCat'}, format='json')

    assert cache.get(key) is None


def test_cache_invalidated_on_csv_import(user, setup_data):
    from django.core.files.uploadedfile import SimpleUploadedFile

    client = APIClient()
    client.force_authenticate(user=user)

    client.get(MATRIX_URL)
    key = _cache_key('matrix', team='', category='', search='')
    assert cache.get(key) is not None

    csv_bytes = b'name,category\nImported,TestCat'
    file = SimpleUploadedFile('skills.csv', csv_bytes, content_type='text/csv')
    client.post('/api/skills/import-csv/', {'file': file}, format='multipart')

    assert cache.get(key) is None


def test_cache_invalidated_on_employee_csv_import(user, setup_data):
    from django.core.files.uploadedfile import SimpleUploadedFile

    client = APIClient()
    client.force_authenticate(user=user)

    client.get(MATRIX_URL)
    key = _cache_key('matrix', team='', category='', search='')
    assert cache.get(key) is not None

    csv_bytes = b'first_name,last_name,email\nNew,Person,new@test.com'
    file = SimpleUploadedFile('emps.csv', csv_bytes, content_type='text/csv')
    client.post('/api/employees/import-csv/', {'file': file}, format='multipart')

    assert cache.get(key) is None
