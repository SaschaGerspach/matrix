from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken

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
def access_token(user):
    return str(AccessToken.for_user(user))


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


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_consumer_accepts_with_valid_cookie(user, access_token):
    from notifications.consumers import NotificationConsumer

    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser(), 'cookies': {'access_token': access_token}}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    consumer.channel_layer.group_add = AsyncMock()
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()
    consumer.send = AsyncMock()

    await consumer.connect()

    consumer.accept.assert_called_once()
    consumer.close.assert_not_called()
    assert consumer.group_name == f'notifications_{user.id}'
    consumer.channel_layer.group_add.assert_called_once()


@pytest.mark.asyncio
async def test_consumer_rejects_without_cookie(db):
    from notifications.consumers import NotificationConsumer

    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser(), 'cookies': {}}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()
    consumer.send = AsyncMock()

    await consumer.connect()

    consumer.accept.assert_not_called()
    consumer.close.assert_called()


@pytest.mark.asyncio
async def test_consumer_rejects_invalid_token(db):
    from notifications.consumers import NotificationConsumer

    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser(), 'cookies': {'access_token': 'bad-token'}}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()
    consumer.send = AsyncMock()

    await consumer.connect()

    consumer.accept.assert_not_called()
    consumer.close.assert_called()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_consumer_sends_notification(user, access_token):
    from notifications.consumers import NotificationConsumer

    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser(), 'cookies': {'access_token': access_token}}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    consumer.channel_layer.group_add = AsyncMock()
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()
    consumer.send = AsyncMock()

    await consumer.connect()
    await consumer.send_notification({'data': {'message': 'hello'}})

    consumer.send.assert_called_once()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_consumer_rate_limits_connections(user, access_token):
    from notifications.consumers import MAX_CONNECTS_PER_MINUTE, NotificationConsumer, _connect_timestamps

    _connect_timestamps.pop(user.id, None)

    for _ in range(MAX_CONNECTS_PER_MINUTE):
        consumer = NotificationConsumer()
        consumer.scope = {'user': AnonymousUser(), 'cookies': {'access_token': access_token}}
        consumer.channel_name = 'test-channel'
        consumer.channel_layer = MagicMock()
        consumer.channel_layer.group_add = AsyncMock()
        consumer.accept = AsyncMock()
        consumer.close = AsyncMock()
        consumer.send = AsyncMock()
        await consumer.connect()
        consumer.accept.assert_called_once()

    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser(), 'cookies': {'access_token': access_token}}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    consumer.channel_layer.group_add = AsyncMock()
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()
    consumer.send = AsyncMock()
    await consumer.connect()
    consumer.accept.assert_not_called()
    consumer.close.assert_called()

    _connect_timestamps.pop(user.id, None)


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_consumer_disconnect_removes_group(user, access_token):
    from notifications.consumers import NotificationConsumer

    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser(), 'cookies': {'access_token': access_token}}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    consumer.channel_layer.group_add = AsyncMock()
    consumer.channel_layer.group_discard = AsyncMock()
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()
    consumer.send = AsyncMock()

    await consumer.connect()
    await consumer.disconnect(1000)

    consumer.channel_layer.group_discard.assert_called_once()
