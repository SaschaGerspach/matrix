import pytest
from rest_framework import status
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

HEALTH_URL = '/api/health/'


def test_health_check_returns_healthy():
    client = APIClient()
    response = client.get(HEALTH_URL)

    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == 'healthy'
    assert response.data['checks']['database'] == 'ok'
    assert response.data['checks']['cache'] == 'ok'


def test_health_check_no_auth_required():
    client = APIClient()
    response = client.get(HEALTH_URL)
    assert response.status_code == status.HTTP_200_OK


def test_sentry_dsn_default_is_empty():
    from django.conf import settings
    assert not getattr(settings, 'SENTRY_DSN', None) or settings.SENTRY_DSN == ''
