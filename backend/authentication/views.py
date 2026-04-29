from django.core.cache import cache
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError


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
            return Response(
                {'detail': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        cache.delete(cache_key)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class RefreshView(APIView):
    permission_classes = ()
    authentication_classes = ()
    throttle_classes = (AuthAnonThrottle,)

    def post(self, request):
        token = request.data.get('refresh')
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
            return Response({
                'access': str(new_refresh.access_token),
                'refresh': str(new_refresh),
            })
        except TokenError:
            return Response(
                {'detail': 'Token is invalid or expired.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        token = request.data.get('refresh')
        if token:
            try:
                RefreshToken(token).blacklist()
            except TokenError:
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)


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
