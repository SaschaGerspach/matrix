import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from skills.models import Skill, SkillCategory, SkillLevelDescription

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/skill-level-descriptions/'


@pytest.fixture
def setup(db):
    admin = User.objects.create_user(username='admin', password='pw!', is_staff=True)
    viewer = User.objects.create_user(username='viewer', password='pw!')
    cat = SkillCategory.objects.create(name='Programming')
    skill = Skill.objects.create(name='Python', category=cat)
    SkillLevelDescription.objects.create(skill=skill, level=1, description='Basic syntax knowledge')
    SkillLevelDescription.objects.create(skill=skill, level=3, description='Can build projects independently')
    return admin, viewer, skill


def test_list_descriptions(setup):
    _, viewer, _ = setup
    c = APIClient()
    c.force_authenticate(user=viewer)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 2


def test_create_description_as_admin(setup):
    admin, _, skill = setup
    c = APIClient()
    c.force_authenticate(user=admin)
    r = c.post(URL, {'skill': skill.id, 'level': 5, 'description': 'Expert and mentor'})
    assert r.status_code == status.HTTP_201_CREATED
    assert SkillLevelDescription.objects.count() == 3


def test_create_description_as_viewer_denied(setup):
    _, viewer, skill = setup
    c = APIClient()
    c.force_authenticate(user=viewer)
    r = c.post(URL, {'skill': skill.id, 'level': 5, 'description': 'Expert'})
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_skill_endpoint_includes_descriptions(setup):
    _, viewer, skill = setup
    c = APIClient()
    c.force_authenticate(user=viewer)
    r = c.get(f'/api/skills/{skill.id}/')
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data['level_descriptions']) == 2
    levels = [d['level'] for d in r.data['level_descriptions']]
    assert 1 in levels
    assert 3 in levels


def test_unique_constraint(setup):
    admin, _, skill = setup
    c = APIClient()
    c.force_authenticate(user=admin)
    r = c.post(URL, {'skill': skill.id, 'level': 1, 'description': 'Duplicate'})
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_unauthenticated():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
