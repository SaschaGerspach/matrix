import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


pytestmark = pytest.mark.django_db


LOGIN_URL = '/api/auth/login/'
LOGOUT_URL = '/api/auth/logout/'
CHANGE_PW_URL = '/api/auth/change-password/'


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username='tester', password='pw12345!')


def test_login_with_valid_credentials_returns_token(user):
    client = APIClient()
    response = client.post(LOGIN_URL, {'username': 'tester', 'password': 'pw12345!'}, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert 'token' in response.data
    assert Token.objects.filter(user=user, key=response.data['token']).exists()


def test_login_with_invalid_credentials_is_rejected(user):
    client = APIClient()
    response = client.post(LOGIN_URL, {'username': 'tester', 'password': 'wrong'}, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_token_grants_access_to_protected_endpoint(user):
    token, _ = Token.objects.get_or_create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    response = client.get('/api/departments/')
    assert response.status_code == status.HTTP_200_OK


def test_logout_deletes_token(user):
    token, _ = Token.objects.get_or_create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    response = client.post(LOGOUT_URL)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not Token.objects.filter(key=token.key).exists()


def test_logout_requires_authentication():
    client = APIClient()
    response = client.post(LOGOUT_URL)
    assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_change_password_succeeds(user):
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post(CHANGE_PW_URL, {
        'current_password': 'pw12345!',
        'new_password': 'newpass123!',
    }, format='json')
    assert response.status_code == status.HTTP_204_NO_CONTENT
    user.refresh_from_db()
    assert user.check_password('newpass123!')


def test_change_password_rejects_wrong_current(user):
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post(CHANGE_PW_URL, {
        'current_password': 'wrong',
        'new_password': 'newpass123!',
    }, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    user.refresh_from_db()
    assert user.check_password('pw12345!')


def test_change_password_rejects_short_new(user):
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post(CHANGE_PW_URL, {
        'current_password': 'pw12345!',
        'new_password': 'short',
    }, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_change_password_requires_auth():
    client = APIClient()
    response = client.post(CHANGE_PW_URL, {
        'current_password': 'pw12345!',
        'new_password': 'newpass123!',
    }, format='json')
    assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
