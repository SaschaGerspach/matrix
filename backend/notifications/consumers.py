import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.authenticated = False
        self.group_name = None
        await self.accept()

    async def receive(self, text_data=None, bytes_data=None):
        if not self.authenticated:
            await self._handle_auth(text_data)
            return

    async def _handle_auth(self, text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            await self.send(text_data=json.dumps({'type': 'auth_error'}))
            await self.close()
            return

        if data.get('type') != 'authenticate' or not data.get('token'):
            await self.send(text_data=json.dumps({'type': 'auth_error'}))
            await self.close()
            return

        user = await self._get_user(data['token'])
        if user.is_anonymous:
            await self.send(text_data=json.dumps({'type': 'auth_error'}))
            await self.close()
            return

        self.scope['user'] = user
        self.authenticated = True
        self.group_name = f'notifications_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.send(text_data=json.dumps({'type': 'auth_ok'}))

    @database_sync_to_async
    def _get_user(self, token_key):
        try:
            validated = AccessToken(token_key)
            from django.contrib.auth import get_user_model
            return get_user_model().objects.get(pk=validated['user_id'])
        except (TokenError, Exception):
            return AnonymousUser()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_notification(self, event):
        if self.authenticated:
            await self.send(text_data=json.dumps(event['data']))
