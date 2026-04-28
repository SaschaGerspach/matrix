import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

LOGIN_URL = '/api/auth/login/'
CHANGE_PW_URL = '/api/auth/change-password/'


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username='tester', password='pw12345!')


def test_login_throttled_after_too_many_attempts(user):
    client = APIClient()
    for _ in range(5):
        client.post(LOGIN_URL, {'username': 'tester', 'password': 'wrong'}, format='json')

    response = client.post(LOGIN_URL, {'username': 'tester', 'password': 'wrong'}, format='json')
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS


def test_change_password_throttled_after_too_many_attempts(user):
    client = APIClient()
    client.force_authenticate(user=user)
    for _ in range(5):
        client.post(CHANGE_PW_URL, {
            'current_password': 'wrong',
            'new_password': 'newpass123!',
        }, format='json')

    response = client.post(CHANGE_PW_URL, {
        'current_password': 'wrong',
        'new_password': 'newpass123!',
    }, format='json')
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
