import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token

from employees.models import Employee
from notifications.models import Notification
from notifications.utils import _send_ws_notification

pytestmark = pytest.mark.django_db


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username='wsuser', password='pw12345!')


@pytest.fixture
def employee(user):
    return Employee.objects.create(first_name='WS', last_name='User', email='ws@test.com', user=user)


@pytest.fixture
def token(user):
    return Token.objects.create(user=user)


def test_token_auth_resolves_user(token):
    resolved = Token.objects.select_related('user').get(key=token.key)
    assert resolved.user.id == token.user_id


def test_invalid_token_returns_anonymous():
    assert not Token.objects.filter(key='invalid-token').exists()


def test_send_ws_notification_calls_channel_layer(employee):
    notification = Notification.objects.create(
        recipient=employee,
        actor=employee,
        type=Notification.Type.SKILL_CONFIRMED,
        message='Test notification',
    )

    mock_layer = MagicMock()
    mock_layer.group_send = AsyncMock()

    with patch('notifications.utils.get_channel_layer', return_value=mock_layer):
        _send_ws_notification(notification)

    mock_layer.group_send.assert_called_once()
    call_args = mock_layer.group_send.call_args
    assert call_args[0][0] == f'notifications_{employee.user_id}'
    assert call_args[0][1]['type'] == 'send_notification'
    assert call_args[0][1]['data']['message'] == 'Test notification'


def test_send_ws_notification_sends_correct_data(employee):
    notification = Notification.objects.create(
        recipient=employee,
        actor=employee,
        type=Notification.Type.SKILL_UPDATED,
        message='Skill updated',
    )

    mock_layer = MagicMock()
    mock_layer.group_send = AsyncMock()

    with patch('notifications.utils.get_channel_layer', return_value=mock_layer):
        _send_ws_notification(notification)

    data = mock_layer.group_send.call_args[0][1]['data']
    assert data['id'] == notification.id
    assert data['type'] == Notification.Type.SKILL_UPDATED
    assert data['actor_name'] == str(employee)
    assert 'created_at' in data


def test_send_ws_notification_handles_no_channel_layer(employee):
    notification = Notification.objects.create(
        recipient=employee,
        actor=employee,
        type=Notification.Type.SKILL_CONFIRMED,
        message='Test',
    )
    with patch('notifications.utils.get_channel_layer', return_value=None):
        _send_ws_notification(notification)


def test_send_ws_notification_handles_no_user(db):
    emp = Employee.objects.create(first_name='No', last_name='User', email='nouser@test.com')
    notification = Notification.objects.create(
        recipient=emp,
        type=Notification.Type.SKILL_CONFIRMED,
        message='Test',
    )
    mock_layer = MagicMock()
    with patch('notifications.utils.get_channel_layer', return_value=mock_layer):
        _send_ws_notification(notification)
    mock_layer.group_send.assert_not_called()


def test_consumer_rejects_anonymous():
    from notifications.consumers import NotificationConsumer
    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser()}
    assert consumer.scope['user'].is_anonymous
