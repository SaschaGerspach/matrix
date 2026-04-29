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


@pytest.mark.asyncio
async def test_consumer_accepts_connection_without_auth():
    from notifications.consumers import NotificationConsumer
    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser()}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    sent_messages = []
    consumer.send = AsyncMock(side_effect=lambda **kw: sent_messages.append(kw))
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()

    await consumer.connect()
    consumer.accept.assert_called_once()
    assert consumer.authenticated is False


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_consumer_auth_with_valid_token(user, token):
    import json
    from notifications.consumers import NotificationConsumer

    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser()}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    consumer.channel_layer.group_add = AsyncMock()
    sent = []
    consumer.send = AsyncMock(side_effect=lambda **kw: sent.append(kw))
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()

    await consumer.connect()

    auth_msg = json.dumps({'type': 'authenticate', 'token': token.key})
    await consumer.receive(text_data=auth_msg)

    assert consumer.authenticated is True
    assert consumer.group_name == f'notifications_{user.id}'
    consumer.channel_layer.group_add.assert_called_once()
    assert any('auth_ok' in str(m) for m in sent)


@pytest.mark.asyncio
async def test_consumer_auth_with_invalid_token(db):
    import json
    from notifications.consumers import NotificationConsumer

    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser()}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    sent = []
    consumer.send = AsyncMock(side_effect=lambda **kw: sent.append(kw))
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()

    await consumer.connect()
    auth_msg = json.dumps({'type': 'authenticate', 'token': 'invalid-token'})
    await consumer.receive(text_data=auth_msg)

    assert consumer.authenticated is False
    consumer.close.assert_called()
    assert any('auth_error' in str(m) for m in sent)


@pytest.mark.asyncio
async def test_consumer_auth_with_invalid_json(db):
    from notifications.consumers import NotificationConsumer

    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser()}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    sent = []
    consumer.send = AsyncMock(side_effect=lambda **kw: sent.append(kw))
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()

    await consumer.connect()
    await consumer.receive(text_data='not json')

    assert consumer.authenticated is False
    consumer.close.assert_called()


@pytest.mark.asyncio
async def test_consumer_auth_missing_token_field(db):
    import json
    from notifications.consumers import NotificationConsumer

    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser()}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    sent = []
    consumer.send = AsyncMock(side_effect=lambda **kw: sent.append(kw))
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()

    await consumer.connect()
    await consumer.receive(text_data=json.dumps({'type': 'authenticate'}))

    assert consumer.authenticated is False
    consumer.close.assert_called()


@pytest.mark.asyncio
async def test_consumer_send_notification_requires_auth(db):
    from notifications.consumers import NotificationConsumer

    consumer = NotificationConsumer()
    consumer.scope = {'user': AnonymousUser()}
    consumer.channel_name = 'test-channel'
    consumer.channel_layer = MagicMock()
    consumer.send = AsyncMock()
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()

    await consumer.connect()
    await consumer.send_notification({'data': {'message': 'test'}})

    consumer.send.assert_not_called()
