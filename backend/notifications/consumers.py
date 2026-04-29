import json
import time

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

_connect_timestamps: dict[int, list[float]] = {}
MAX_CONNECTS_PER_MINUTE = 10


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = None
        user = await self._authenticate_from_cookie()
        if user.is_anonymous:
            await self.close()
            return

        if self._is_rate_limited(user.id):
            await self.close()
            return

        self.scope['user'] = user
        self.group_name = f'notifications_{user.id}'
        await self.accept()
        await self.channel_layer.group_add(self.group_name, self.channel_name)

    @staticmethod
    def _is_rate_limited(user_id: int) -> bool:
        now = time.monotonic()
        timestamps = _connect_timestamps.setdefault(user_id, [])
        timestamps[:] = [t for t in timestamps if now - t < 60]
        if len(timestamps) >= MAX_CONNECTS_PER_MINUTE:
            return True
        timestamps.append(now)
        return False

    @database_sync_to_async
    def _authenticate_from_cookie(self):
        cookies = self.scope.get('cookies', {})
        token = cookies.get('access_token')
        if not token:
            return AnonymousUser()
        try:
            validated = AccessToken(token)
            from django.contrib.auth import get_user_model
            return get_user_model().objects.get(pk=validated['user_id'])
        except (TokenError, Exception):
            return AnonymousUser()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event['data']))
