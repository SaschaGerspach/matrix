import logging

from django.conf import settings
from django.core.cache import cache
from django.middleware.csrf import get_token
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from common.audit import log_action

logger = logging.getLogger(__name__)

ACCESS_COOKIE_MAX_AGE = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
REFRESH_COOKIE_MAX_AGE = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
COOKIE_SECURE = not settings.DEBUG
COOKIE_SAMESITE = 'Lax'


def _set_auth_cookies(response, access, refresh):
    response.set_cookie(
        'access_token',
        access,
        max_age=ACCESS_COOKIE_MAX_AGE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path='/',
    )
    response.set_cookie(
        'refresh_token',
        refresh,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path='/api/auth/',
    )


def _clear_auth_cookies(response):
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/api/auth/')


class AuthAnonThrottle(AnonRateThrottle):
    scope = 'auth'


class AuthUserThrottle(SimpleRateThrottle):
    scope = 'auth'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return self.cache_format % {
                'scope': self.scope,
                'ident': request.user.pk,
            }
        return self.get_ident(request)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


MAX_LOGIN_ATTEMPTS = 10
LOCKOUT_DURATION = 900


class LoginView(APIView):
    permission_classes = ()
    authentication_classes = ()
    throttle_classes = (AuthAnonThrottle,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data['username']
        cache_key = f'login_attempts:{username}'

        attempts = cache.get(cache_key, 0)
        if attempts >= MAX_LOGIN_ATTEMPTS:
            log_action(None, 'lockout', 'User', detail=f'Account locked: {username}')
            logger.warning('Account locked out: %s', username)
            return Response(
                {'detail': 'Account temporarily locked. Try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        from django.contrib.auth import authenticate
        user = authenticate(
            request=request,
            username=username,
            password=serializer.validated_data['password'],
        )
        if user is None:
            cache.set(cache_key, attempts + 1, LOCKOUT_DURATION)
            log_action(None, 'login_failed', 'User', detail=f'Failed login: {username}')
            return Response(
                {'detail': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        cache.delete(cache_key)
        log_action(user, 'login', 'User', entity_id=user.pk)
        refresh = RefreshToken.for_user(user)
        response = Response({'detail': 'ok'})
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        get_token(request)
        return response


class RefreshView(APIView):
    permission_classes = ()
    authentication_classes = ()
    throttle_classes = (AuthAnonThrottle,)

    def post(self, request):
        token = request.COOKIES.get('refresh_token')
        if not token:
            return Response(
                {'detail': 'Refresh token required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            old_refresh = RefreshToken(token)
            old_refresh.blacklist()
            from django.contrib.auth import get_user_model
            user = get_user_model().objects.get(pk=old_refresh['user_id'])
            new_refresh = RefreshToken.for_user(user)
            response = Response({'detail': 'ok'})
            _set_auth_cookies(response, str(new_refresh.access_token), str(new_refresh))
            return response
        except TokenError:
            response = Response(
                {'detail': 'Token is invalid or expired.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_auth_cookies(response)
            return response


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        import contextlib
        token = request.COOKIES.get('refresh_token')
        if token:
            with contextlib.suppress(TokenError):
                RefreshToken(token).blacklist()
        log_action(request.user, 'logout', 'User', entity_id=request.user.pk)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_auth_cookies(response)
        return response


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(max_length=128)
    new_password = serializers.CharField(min_length=8, max_length=128)


class ChangePasswordView(APIView):
    permission_classes = (IsAuthenticated,)
    throttle_classes = (AuthUserThrottle,)

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data['current_password']):
            return Response({'current_password': ['Incorrect password.']}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(serializer.validated_data['new_password'], user=request.user)
        except ValidationError as e:
            return Response({'new_password': e.messages}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
