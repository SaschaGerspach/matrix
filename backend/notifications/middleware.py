from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser


class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        scope['user'] = AnonymousUser()
        return await super().__call__(scope, receive, send)
