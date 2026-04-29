import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client(db):
    user = get_user_model().objects.create_user(username='u', password='pw!')
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@override_settings(DEBUG=False)
def test_csp_header_set_in_production(auth_client):
    response = auth_client.get('/api/departments/')
    csp = response['Content-Security-Policy']
    assert "default-src 'self'" in csp
    assert "script-src 'self'" in csp
    assert "'unsafe-eval'" not in csp
    assert "frame-ancestors 'none'" in csp


@override_settings(DEBUG=True)
def test_csp_header_relaxed_in_debug(auth_client):
    response = auth_client.get('/api/departments/')
    csp = response['Content-Security-Policy']
    assert "default-src 'self'" in csp
    assert "'unsafe-eval'" in csp
    assert "ws:" in csp
