import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import translation
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory

pytestmark = pytest.mark.django_db

CATEGORIES_URL = '/api/skill-categories/'
MATRIX_URL = '/api/skill-matrix/'
MY_SKILLS_URL = '/api/my-skills/'


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def admin_client(db):
    user = get_user_model().objects.create_user(username='admin', password='pw!', is_superuser=True)
    Employee.objects.create(first_name='Ada', last_name='Admin', email='ada@example.com', user=user)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def programming(db):
    return SkillCategory.objects.create(name='Programming', name_de='Programmierung')


def test_display_name_follows_the_active_language(programming):
    with translation.override('de'):
        assert programming.display_name == 'Programmierung'
    with translation.override('en'):
        assert programming.display_name == 'Programming'


def test_display_name_falls_back_when_there_is_no_german_name():
    soft = SkillCategory(name='Soft Skills')
    with translation.override('de'):
        assert soft.display_name == 'Soft Skills'


def test_category_list_returns_both_names_and_the_requested_one(admin_client, programming):
    de = admin_client.get(CATEGORIES_URL, HTTP_ACCEPT_LANGUAGE='de').json()[0]
    en = admin_client.get(CATEGORIES_URL, HTTP_ACCEPT_LANGUAGE='en').json()[0]

    assert de['name'] == en['name'] == 'Programming'
    assert de['name_de'] == en['name_de'] == 'Programmierung'
    assert de['display_name'] == 'Programmierung'
    assert en['display_name'] == 'Programming'


def test_admin_can_set_the_german_name(admin_client):
    created = admin_client.post(CATEGORIES_URL, {'name': 'Data', 'name_de': 'Daten'}, format='json')
    assert created.status_code == status.HTTP_201_CREATED

    patched = admin_client.patch(
        f"{CATEGORIES_URL}{created.json()['id']}/", {'name_de': 'Datenhaltung'}, format='json',
    )
    assert patched.status_code == status.HTTP_200_OK
    assert SkillCategory.objects.get().name_de == 'Datenhaltung'


def test_nested_category_names_follow_the_request_language(admin_client, programming):
    skill = Skill.objects.create(name='Python', category=programming)
    SkillAssignment.objects.create(employee=Employee.objects.get(), skill=skill, level=3)

    de = admin_client.get(MY_SKILLS_URL, HTTP_ACCEPT_LANGUAGE='de').json()
    en = admin_client.get(MY_SKILLS_URL, HTTP_ACCEPT_LANGUAGE='en').json()

    assert de[0]['category_name'] == 'Programmierung'
    assert en[0]['category_name'] == 'Programming'


def test_cached_matrix_is_kept_per_language(admin_client, programming):
    Skill.objects.create(name='Python', category=programming)

    de = admin_client.get(MATRIX_URL, HTTP_ACCEPT_LANGUAGE='de').json()
    en = admin_client.get(MATRIX_URL, HTTP_ACCEPT_LANGUAGE='en').json()

    assert de['skills'][0]['category_name'] == 'Programmierung'
    assert en['skills'][0]['category_name'] == 'Programming'
