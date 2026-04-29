import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_schema_endpoint_returns_openapi(db):
    user = User.objects.create_user(username='viewer', password='pw!')
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get('/api/schema/')
    assert r.status_code == status.HTTP_200_OK
    assert r['Content-Type'] in ('application/vnd.oai.openapi', 'application/vnd.oai.openapi; charset=utf-8')


def test_swagger_ui_accessible(db):
    user = User.objects.create_user(username='viewer', password='pw!')
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get('/api/docs/')
    assert r.status_code == status.HTTP_200_OK


def test_schema_contains_api_paths(db):
    user = User.objects.create_user(username='viewer', password='pw!')
    c = APIClient()
    c.force_authenticate(user=user)
    r = c.get('/api/schema/', format='json')
    assert r.status_code == status.HTTP_200_OK
    paths = r.data.get('paths', {})
    assert '/api/skills/' in paths
    assert '/api/employees/' in paths
    assert '/api/kpi/' in paths


def test_schema_accessible_without_auth():
    c = APIClient()
    r = c.get('/api/schema/')
    assert r.status_code == status.HTTP_200_OK
