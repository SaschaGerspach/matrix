import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from notifications.models import Notification

pytestmark = pytest.mark.django_db

User = get_user_model()
BASE_URL = '/api/notifications/'


@pytest.fixture
def setup(db):
    user = User.objects.create_user(username='viewer', password='pw!')
    emp = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com', user=user)
    Notification.objects.create(
        recipient=emp, type=Notification.Type.SKILL_CONFIRMED,
        message='Bob confirmed your Python skill',
    )
    Notification.objects.create(
        recipient=emp, type=Notification.Type.SKILL_PENDING,
        message='Carol added Docker', is_read=True,
    )
    return user, emp


def test_list_own_notifications(setup):
    user, _ = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(BASE_URL)
    assert r.status_code == status.HTTP_200_OK
    assert r.data['count'] == 2


def test_unread_count(setup):
    user, _ = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get(f'{BASE_URL}unread_count/')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['count'] == 1


def test_mark_as_read(setup):
    user, emp = setup
    c = APIClient()
    c.force_authenticate(user=user)
    n = Notification.objects.filter(recipient=emp, is_read=False).first()
    r = c.post(f'{BASE_URL}{n.id}/read/')
    assert r.status_code == status.HTTP_200_OK
    assert r.data['is_read'] is True
    n.refresh_from_db()
    assert n.is_read is True


def test_read_all(setup):
    user, emp = setup
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.post(f'{BASE_URL}read_all/')
    assert r.status_code == status.HTTP_200_OK
    assert Notification.objects.filter(recipient=emp, is_read=False).count() == 0


def test_cannot_see_other_notifications(setup):
    other_user = User.objects.create_user(username='other', password='pw!')
    Employee.objects.create(first_name='Other', last_name='O', email='o@x.com', user=other_user)
    c = APIClient()
    c.force_authenticate(user=other_user)
    r = c.get(BASE_URL)
    assert r.data['count'] == 0


def test_unauthenticated():
    c = APIClient()
    r = c.get(BASE_URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
