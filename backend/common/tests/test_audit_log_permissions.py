import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

User = get_user_model()
AUDIT_URL = '/api/audit-log/'


@pytest.fixture
def admin_client(db):
    user = User.objects.create_user(username='admin', password='pw!', is_staff=True)
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def regular_client(db):
    user = User.objects.create_user(username='user', password='pw!')
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def test_admin_can_list_audit_log(admin_client):
    r = admin_client.get(AUDIT_URL)
    assert r.status_code == status.HTTP_200_OK


def test_regular_user_cannot_list_audit_log(regular_client):
    r = regular_client.get(AUDIT_URL)
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_unauthenticated_cannot_list_audit_log():
    c = APIClient()
    r = c.get(AUDIT_URL)
    assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
