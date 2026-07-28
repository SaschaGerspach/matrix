import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username='admin', password='pw!', is_superuser=True)


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
def lead_setup(db):
    """A lead of Core, plus an unrelated team they must not be able to touch."""
    user = User.objects.create_user(username='lead', password='pw!')
    lead = Employee.objects.create(first_name='Lea', last_name='D', email='lead@x.com', user=user)
    outsider = Employee.objects.create(first_name='Otto', last_name='O', email='otto@x.com')
    dept = Department.objects.create(name='Eng')
    core = Team.objects.create(name='Core', department=dept)
    core.team_leads.add(lead)
    other = Team.objects.create(name='Other', department=dept)
    client = APIClient()
    client.force_authenticate(user=user)
    return {'client': client, 'lead': lead, 'outsider': outsider, 'core': core, 'other': other}


def test_lead_can_add_a_member_to_their_own_team(lead_setup):
    r = lead_setup['client'].patch(
        f"/api/teams/{lead_setup['core'].id}/",
        {'members': [lead_setup['outsider'].id]},
        format='json',
    )

    assert r.status_code == status.HTTP_200_OK
    assert list(lead_setup['core'].members.all()) == [lead_setup['outsider']]


def test_lead_cannot_touch_a_team_they_do_not_lead(lead_setup):
    r = lead_setup['client'].patch(
        f"/api/teams/{lead_setup['other'].id}/",
        {'members': [lead_setup['outsider'].id]},
        format='json',
    )

    assert r.status_code == status.HTTP_403_FORBIDDEN
    assert lead_setup['other'].members.count() == 0


def test_lead_cannot_make_themselves_lead_elsewhere(lead_setup):
    """The object check passes for their own team, so the field limit must hold."""
    r = lead_setup['client'].patch(
        f"/api/teams/{lead_setup['core'].id}/",
        {'team_leads': [lead_setup['outsider'].id]},
        format='json',
    )

    assert r.status_code == status.HTTP_400_BAD_REQUEST
    assert list(lead_setup['core'].team_leads.all()) == [lead_setup['lead']]


def test_lead_cannot_rename_their_team(lead_setup):
    r = lead_setup['client'].patch(
        f"/api/teams/{lead_setup['core'].id}/", {'name': 'Renamed'}, format='json',
    )

    assert r.status_code == status.HTTP_400_BAD_REQUEST
    lead_setup['core'].refresh_from_db()
    assert lead_setup['core'].name == 'Core'


def test_lead_cannot_create_or_delete_teams(lead_setup):
    dept = lead_setup['core'].department

    created = lead_setup['client'].post(
        '/api/teams/', {'name': 'New', 'department': dept.id}, format='json',
    )
    deleted = lead_setup['client'].delete(f"/api/teams/{lead_setup['core'].id}/")

    assert created.status_code == status.HTTP_403_FORBIDDEN
    assert deleted.status_code == status.HTTP_403_FORBIDDEN


def test_plain_member_cannot_edit_teams(regular_client, db):
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)

    r = regular_client.patch(f'/api/teams/{team.id}/', {'members': []}, format='json')

    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_admin_can_create_department(admin_client):
    r = admin_client.post('/api/departments/', {'name': 'Engineering'}, format='json')
    assert r.status_code == status.HTTP_201_CREATED


def test_admin_can_crud_department(admin_client):
    r = admin_client.post('/api/departments/', {'name': 'Engineering'}, format='json')
    dept_id = r.data['id']

    r = admin_client.patch(f'/api/departments/{dept_id}/', {'name': 'Eng'}, format='json')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['name'] == 'Eng'

    r = admin_client.delete(f'/api/departments/{dept_id}/')
    assert r.status_code == status.HTTP_204_NO_CONTENT


def test_admin_can_create_team_with_members(admin_client):
    dept = Department.objects.create(name='Eng')
    alice = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com')
    bob = Employee.objects.create(first_name='Bob', last_name='B', email='b@x.com')
    r = admin_client.post(
        '/api/teams/',
        {'name': 'Core', 'department': dept.id, 'members': [alice.id, bob.id], 'team_leads': [bob.id]},
        format='json',
    )
    assert r.status_code == status.HTTP_201_CREATED
    team = Team.objects.get(pk=r.data['id'])
    assert set(team.members.all()) == {alice, bob}
    assert list(team.team_leads.all()) == [bob]


def test_admin_can_update_team(admin_client):
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)

    r = admin_client.patch(f'/api/teams/{team.id}/', {'name': 'Platform'}, format='json')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['name'] == 'Platform'


def test_team_list_carries_member_and_lead_names(admin_client):
    dept = Department.objects.create(name='Eng')
    alice = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com')
    team = Team.objects.create(name='Core', department=dept)
    team.members.add(alice)
    team.team_leads.add(alice)

    r = admin_client.get('/api/teams/')

    assert r.data[0]['member_details'] == [{'id': alice.id, 'full_name': 'Alice A'}]
    assert r.data[0]['lead_details'] == [{'id': alice.id, 'full_name': 'Alice A'}]


def test_admin_can_create_a_team_with_just_a_name_and_department(admin_client):
    """What the app sends: an empty team that gets staffed afterwards."""
    dept = Department.objects.create(name='Eng')

    r = admin_client.post('/api/teams/', {'name': 'Platform', 'department': dept.id}, format='json')

    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['member_details'] == []
    assert r.data['lead_details'] == []


def test_admin_can_make_an_outsider_lead_and_member_at_once(admin_client):
    dept = Department.objects.create(name='Eng')
    outsider = Employee.objects.create(first_name='Otto', last_name='O', email='o@x.com')
    team = Team.objects.create(name='Core', department=dept)

    r = admin_client.patch(
        f'/api/teams/{team.id}/',
        {'team_leads': [outsider.id], 'members': [outsider.id]},
        format='json',
    )

    assert r.status_code == status.HTTP_200_OK
    assert list(team.team_leads.all()) == [outsider]
    assert list(team.members.all()) == [outsider]


def test_admin_can_assign_a_team_lead(admin_client):
    dept = Department.objects.create(name='Eng')
    alice = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com')
    team = Team.objects.create(name='Core', department=dept)
    team.members.add(alice)

    r = admin_client.patch(
        f'/api/teams/{team.id}/', {'team_leads': [alice.id]}, format='json',
    )

    assert r.status_code == status.HTTP_200_OK
    assert list(team.team_leads.all()) == [alice]


def test_admin_can_delete_team(admin_client):
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)

    r = admin_client.delete(f'/api/teams/{team.id}/')
    assert r.status_code == status.HTTP_204_NO_CONTENT
    assert Team.objects.filter(pk=team.id).count() == 0


def test_regular_user_cannot_update_team(regular_client):
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)

    r = regular_client.patch(f'/api/teams/{team.id}/', {'name': 'X'}, format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_regular_user_cannot_delete_team(regular_client):
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)

    r = regular_client.delete(f'/api/teams/{team.id}/')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_regular_user_can_list_but_not_create(regular_client):
    r = regular_client.get('/api/departments/')
    assert r.status_code == status.HTTP_200_OK

    r = regular_client.post('/api/departments/', {'name': 'X'}, format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN
