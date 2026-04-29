import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.views import LoginView


pytestmark = pytest.mark.django_db


LOGIN_URL = '/api/auth/login/'
REFRESH_URL = '/api/auth/refresh/'
LOGOUT_URL = '/api/auth/logout/'
CHANGE_PW_URL = '/api/auth/change-password/'


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username='tester', password='pw12345!')


def _login(client, username='tester', password='pw12345!'):
    return client.post(LOGIN_URL, {'username': username, 'password': password}, format='json')


def _auth_client(user):
    """Create client with access_token cookie set."""
    refresh = RefreshToken.for_user(user)
    c = APIClient()
    c.cookies['access_token'] = str(refresh.access_token)
    return c, refresh


def test_login_sets_httponly_cookies(user):
    client = APIClient()
    response = _login(client)
    assert response.status_code == status.HTTP_200_OK
    assert 'access_token' in response.cookies
    assert 'refresh_token' in response.cookies
    assert response.cookies['access_token']['httponly']
    assert response.cookies['refresh_token']['httponly']


def test_login_with_invalid_credentials_is_rejected(user):
    client = APIClient()
    response = client.post(LOGIN_URL, {'username': 'tester', 'password': 'wrong'}, format='json')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert 'access_token' not in response.cookies


def test_access_cookie_grants_access_to_protected_endpoint(user):
    client, _ = _auth_client(user)
    response = client.get('/api/departments/')
    assert response.status_code == status.HTTP_200_OK


def test_refresh_reads_cookie_and_sets_new_cookies(user):
    refresh = RefreshToken.for_user(user)
    client = APIClient()
    client.cookies['refresh_token'] = str(refresh)
    response = client.post(REFRESH_URL, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert 'access_token' in response.cookies
    assert 'refresh_token' in response.cookies


def test_refresh_blacklists_old_token(user):
    refresh = RefreshToken.for_user(user)
    old_token = str(refresh)
    client = APIClient()
    client.cookies['refresh_token'] = old_token
    client.post(REFRESH_URL, format='json')

    client2 = APIClient()
    client2.cookies['refresh_token'] = old_token
    response = client2.post(REFRESH_URL, format='json')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_refresh_without_cookie_is_rejected():
    client = APIClient()
    response = client.post(REFRESH_URL, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_logout_clears_cookies(user):
    client, _ = _auth_client(user)
    refresh = RefreshToken.for_user(user)
    client.cookies['refresh_token'] = str(refresh)
    response = client.post(LOGOUT_URL, format='json')
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert response.cookies['access_token']['max-age'] == 0
    assert response.cookies['refresh_token']['max-age'] == 0


def test_logout_requires_authentication():
    client = APIClient()
    response = client.post(LOGOUT_URL)
    assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_change_password_succeeds(user):
    client, _ = _auth_client(user)
    response = client.post(CHANGE_PW_URL, {
        'current_password': 'pw12345!',
        'new_password': 'newpass123!',
    }, format='json')
    assert response.status_code == status.HTTP_204_NO_CONTENT
    user.refresh_from_db()
    assert user.check_password('newpass123!')


def test_change_password_rejects_wrong_current(user):
    client, _ = _auth_client(user)
    response = client.post(CHANGE_PW_URL, {
        'current_password': 'wrong',
        'new_password': 'newpass123!',
    }, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    user.refresh_from_db()
    assert user.check_password('pw12345!')


def test_change_password_rejects_short_new(user):
    client, _ = _auth_client(user)
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


def test_change_password_rejects_common_password(user):
    client, _ = _auth_client(user)
    response = client.post(CHANGE_PW_URL, {
        'current_password': 'pw12345!',
        'new_password': 'password',
    }, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'new_password' in response.data


def test_change_password_rejects_numeric_only(user):
    client, _ = _auth_client(user)
    response = client.post(CHANGE_PW_URL, {
        'current_password': 'pw12345!',
        'new_password': '12345678',
    }, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'new_password' in response.data


def test_change_password_rejects_username_similar(db):
    u = get_user_model().objects.create_user(username='johndoe', password='pw12345!')
    client, _ = _auth_client(u)
    response = client.post(CHANGE_PW_URL, {
        'current_password': 'pw12345!',
        'new_password': 'johndoe1',
    }, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'new_password' in response.data


def test_login_creates_audit_log(user):
    from common.models import AuditLog
    client = APIClient()
    _login(client)
    entry = AuditLog.objects.filter(action='login').last()
    assert entry is not None
    assert entry.user == user
    assert entry.entity_id == user.pk


def test_failed_login_creates_audit_log(user):
    from common.models import AuditLog
    client = APIClient()
    client.post(LOGIN_URL, {'username': 'tester', 'password': 'wrong'}, format='json')
    entry = AuditLog.objects.filter(action='login_failed').last()
    assert entry is not None
    assert entry.user is None
    assert 'tester' in entry.detail


def test_lockout_creates_audit_log(user):
    from unittest.mock import patch
    from django.core.cache import cache
    from common.models import AuditLog
    cache.clear()
    client = APIClient()

    with patch.object(LoginView, 'throttle_classes', ()):
        for _ in range(10):
            client.post(LOGIN_URL, {'username': 'tester', 'password': 'wrong'}, format='json')
        client.post(LOGIN_URL, {'username': 'tester', 'password': 'wrong'}, format='json')

    entry = AuditLog.objects.filter(action='lockout').last()
    assert entry is not None
    assert 'tester' in entry.detail


def test_logout_creates_audit_log(user):
    from common.models import AuditLog
    client, _ = _auth_client(user)
    client.post(LOGOUT_URL, format='json')
    entry = AuditLog.objects.filter(action='logout').last()
    assert entry is not None
    assert entry.user == user
    assert entry.entity_id == user.pk


def test_account_lockout_after_max_attempts(user):
    from unittest.mock import patch
    from django.core.cache import cache
    cache.clear()
    client = APIClient()

    with patch.object(LoginView, 'throttle_classes', ()):
        for _ in range(10):
            client.post(LOGIN_URL, {'username': 'tester', 'password': 'wrong'}, format='json')

        response = client.post(LOGIN_URL, {'username': 'tester', 'password': 'wrong'}, format='json')
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

        response = client.post(LOGIN_URL, {'username': 'tester', 'password': 'pw12345!'}, format='json')
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS


def test_successful_login_resets_lockout_counter(user):
    from unittest.mock import patch
    from django.core.cache import cache
    cache.clear()
    client = APIClient()

    with patch.object(LoginView, 'throttle_classes', ()):
        for _ in range(5):
            client.post(LOGIN_URL, {'username': 'tester', 'password': 'wrong'}, format='json')

        response = client.post(LOGIN_URL, {'username': 'tester', 'password': 'pw12345!'}, format='json')
        assert response.status_code == status.HTTP_200_OK

        assert cache.get('login_attempts:tester') is None


def test_refresh_cookie_path_is_scoped(user):
    client = APIClient()
    response = _login(client)
    assert response.cookies['refresh_token']['path'] == '/api/auth/'
