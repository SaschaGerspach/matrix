import pytest
from django.test import override_settings
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

ORIGIN = 'http://frontend.example.com'


@override_settings(CORS_ALLOWED_ORIGINS=[ORIGIN])
def test_cors_allowed_origin_returns_headers():
    client = APIClient()
    response = client.options(
        '/api/departments/',
        HTTP_ORIGIN=ORIGIN,
        HTTP_ACCESS_CONTROL_REQUEST_METHOD='GET',
    )
    assert response['Access-Control-Allow-Origin'] == ORIGIN
    assert 'true' in response['Access-Control-Allow-Credentials']


@override_settings(CORS_ALLOWED_ORIGINS=[ORIGIN])
def test_cors_disallowed_origin_no_header():
    client = APIClient()
    response = client.options(
        '/api/departments/',
        HTTP_ORIGIN='http://evil.example.com',
        HTTP_ACCESS_CONTROL_REQUEST_METHOD='GET',
    )
    assert response.get('Access-Control-Allow-Origin') is None


@override_settings(CORS_ALLOWED_ORIGINS=[ORIGIN])
def test_cors_preflight_max_age():
    client = APIClient()
    response = client.options(
        '/api/departments/',
        HTTP_ORIGIN=ORIGIN,
        HTTP_ACCESS_CONTROL_REQUEST_METHOD='GET',
    )
    assert response['Access-Control-Max-Age'] == '86400'


@override_settings(CORS_ALLOWED_ORIGINS=[ORIGIN])
def test_cors_allows_csrftoken_header():
    client = APIClient()
    response = client.options(
        '/api/departments/',
        HTTP_ORIGIN=ORIGIN,
        HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS='x-csrftoken',
    )
    allowed_headers = response['Access-Control-Allow-Headers'].lower()
    assert 'x-csrftoken' in allowed_headers
