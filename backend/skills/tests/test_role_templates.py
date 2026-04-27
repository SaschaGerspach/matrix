import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from skills.models import RoleTemplate, RoleTemplateSkill, Skill, SkillCategory, SkillRequirement
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/role-templates/'


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(username='admin', password='pw!')


@pytest.fixture
def viewer(db):
    return User.objects.create_user(username='viewer', password='pw!')


@pytest.fixture
def setup(admin_user):
    cat = SkillCategory.objects.create(name='Programming')
    python = Skill.objects.create(name='Python', category=cat)
    docker = Skill.objects.create(name='Docker', category=cat)
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Alpha', department=dept)
    return {'admin': admin_user, 'python': python, 'docker': docker, 'team': team}


def test_create_template(setup):
    c = APIClient()
    c.force_authenticate(user=setup['admin'])
    r = c.post(URL, {'name': 'Backend Dev', 'description': 'Backend developer role'})
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['name'] == 'Backend Dev'
    assert RoleTemplate.objects.count() == 1


def test_list_templates(setup):
    RoleTemplate.objects.create(name='Frontend Dev')
    c = APIClient()
    c.force_authenticate(user=setup['admin'])
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data) == 1


def test_add_skill_to_template(setup):
    tpl = RoleTemplate.objects.create(name='Backend Dev')
    c = APIClient()
    c.force_authenticate(user=setup['admin'])
    r = c.post(f'{URL}{tpl.id}/add-skill/', {'skill': setup['python'].id, 'required_level': 4})
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data['skills']) == 1
    assert r.data['skills'][0]['required_level'] == 4


def test_remove_skill_from_template(setup):
    tpl = RoleTemplate.objects.create(name='Backend Dev')
    ts = RoleTemplateSkill.objects.create(template=tpl, skill=setup['python'], required_level=3)
    c = APIClient()
    c.force_authenticate(user=setup['admin'])
    r = c.delete(f'{URL}{tpl.id}/remove-skill/{ts.id}/')
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data['skills']) == 0


def test_apply_template_to_team(setup):
    tpl = RoleTemplate.objects.create(name='Backend Dev')
    RoleTemplateSkill.objects.create(template=tpl, skill=setup['python'], required_level=4)
    RoleTemplateSkill.objects.create(template=tpl, skill=setup['docker'], required_level=3)

    c = APIClient()
    c.force_authenticate(user=setup['admin'])
    r = c.post(f'{URL}{tpl.id}/apply/', {'team': setup['team'].id})
    assert r.status_code == status.HTTP_200_OK
    assert r.data == {'created': 2, 'updated': 0}
    assert SkillRequirement.objects.filter(team=setup['team']).count() == 2


def test_apply_template_updates_existing(setup):
    tpl = RoleTemplate.objects.create(name='Backend Dev')
    RoleTemplateSkill.objects.create(template=tpl, skill=setup['python'], required_level=4)
    SkillRequirement.objects.create(team=setup['team'], skill=setup['python'], required_level=2)

    c = APIClient()
    c.force_authenticate(user=setup['admin'])
    r = c.post(f'{URL}{tpl.id}/apply/', {'team': setup['team'].id})
    assert r.status_code == status.HTTP_200_OK
    assert r.data == {'created': 0, 'updated': 1}
    req = SkillRequirement.objects.get(team=setup['team'], skill=setup['python'])
    assert req.required_level == 4


def test_readonly_for_non_admin(setup, viewer):
    RoleTemplate.objects.create(name='Frontend Dev')
    c = APIClient()
    c.force_authenticate(user=viewer)
    r = c.get(URL)
    assert r.status_code == status.HTTP_200_OK
    r = c.post(URL, {'name': 'New', 'description': ''})
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_unauthenticated():
    c = APIClient()
    r = c.get(URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
