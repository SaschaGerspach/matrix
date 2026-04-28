import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from certificates.models import Certificate
from employees.models import Employee
from skills.models import Skill, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()
URL = '/api/certificates/'


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
def employee(regular_user):
    return Employee.objects.create(
        first_name='Max', last_name='Muster', email='max@example.com', user=regular_user,
    )


@pytest.fixture
def regular_client(regular_user):
    c = APIClient()
    c.force_authenticate(user=regular_user)
    return c


@pytest.fixture
def skill(db):
    cat = SkillCategory.objects.create(name='Programming')
    return Skill.objects.create(name='Python', category=cat)


@pytest.fixture
def certificate(employee, skill):
    return Certificate.objects.create(
        employee=employee, skill=skill, name='Python Cert', issuer='Acme',
    )


def test_admin_can_create_certificate(admin_client):
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    r = admin_client.post(URL, {'employee': emp.id, 'name': 'AWS Solutions Architect'}, format='json')
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['name'] == 'AWS Solutions Architect'
    assert r.data['skill'] is None


def test_certificate_with_skill(admin_client, skill):
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    r = admin_client.post(URL, {
        'employee': emp.id, 'skill': skill.id, 'name': 'Python Advanced',
    }, format='json')
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['skill'] == skill.id
    assert r.data['skill_name'] == 'Python'


def test_certificate_without_file_is_valid(admin_client):
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    r = admin_client.post(URL, {'employee': emp.id, 'name': 'Some Cert'}, format='json')
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['file'] is None or r.data['file'] == ''


def test_list_certificates_filtered_by_employee(admin_client, certificate):
    other_emp = Employee.objects.create(first_name='X', last_name='Y', email='x@y.com')
    Certificate.objects.create(employee=other_emp, name='Other Cert')
    r = admin_client.get(f'{URL}?employee={certificate.employee_id}')
    assert r.status_code == status.HTTP_200_OK
    assert len(r.data['results']) == 1
    assert r.data['results'][0]['name'] == 'Python Cert'


def test_employee_can_create_own_certificate(regular_client, employee):
    r = regular_client.post(URL, {'employee': employee.id, 'name': 'My Cert'}, format='json')
    assert r.status_code == status.HTTP_201_CREATED


def test_employee_can_update_own_certificate(regular_client, certificate):
    r = regular_client.patch(f'{URL}{certificate.id}/', {'name': 'Updated'}, format='json')
    assert r.status_code == status.HTTP_200_OK
    certificate.refresh_from_db()
    assert certificate.name == 'Updated'


def test_employee_can_delete_own_certificate(regular_client, certificate):
    r = regular_client.delete(f'{URL}{certificate.id}/')
    assert r.status_code == status.HTTP_204_NO_CONTENT
    assert not Certificate.objects.filter(id=certificate.id).exists()


def test_employee_cannot_modify_other_certificate(regular_client):
    other_emp = Employee.objects.create(first_name='X', last_name='Y', email='x@y.com')
    cert = Certificate.objects.create(employee=other_emp, name='Not mine')
    r = regular_client.patch(f'{URL}{cert.id}/', {'name': 'Hacked'}, format='json')
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_employee_cannot_change_owner(regular_client, certificate):
    other_emp = Employee.objects.create(first_name='X', last_name='Y', email='x@y.com')
    r = regular_client.patch(
        f'{URL}{certificate.id}/', {'employee': other_emp.id}, format='json',
    )
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_team_lead_can_modify_member_certificate(db):
    lead_user = User.objects.create_user(username='lead', password='pw!')
    lead_emp = Employee.objects.create(
        first_name='Lead', last_name='Person', email='lead@example.com', user=lead_user,
    )
    member = Employee.objects.create(first_name='Member', last_name='One', email='m@example.com')
    dept = Department.objects.create(name='Dept')
    team = Team.objects.create(name='Team A', department=dept)
    team.team_leads.add(lead_emp)
    team.members.add(member)
    cert = Certificate.objects.create(employee=member, name='Member Cert')

    client = APIClient()
    client.force_authenticate(user=lead_user)
    r = client.patch(f'{URL}{cert.id}/', {'name': 'Approved Cert'}, format='json')
    assert r.status_code == status.HTTP_200_OK


def test_unauthenticated_cannot_access(db):
    c = APIClient()
    r = c.get(URL)
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_optional_fields(admin_client):
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    r = admin_client.post(URL, {
        'employee': emp.id,
        'name': 'Full Cert',
        'issuer': 'Acme Corp',
        'issued_date': '2025-01-15',
        'expiry_date': '2027-01-15',
    }, format='json')
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data['issuer'] == 'Acme Corp'
    assert r.data['issued_date'] == '2025-01-15'
    assert r.data['expiry_date'] == '2027-01-15'
