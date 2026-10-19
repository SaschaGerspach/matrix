import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.sessions import CookieMiddleware
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

from notifications.middleware import TokenAuthMiddleware
from notifications.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    # The consumer authenticates from the access_token cookie, and Channels only
    # fills scope['cookies'] when CookieMiddleware wraps the stack.
    'websocket': CookieMiddleware(TokenAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    )),
})
