from rest_framework import serializers, status
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView


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


class ThrottledObtainAuthToken(ObtainAuthToken):
    throttle_classes = (AuthAnonThrottle,)


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        token = getattr(request.user, 'auth_token', None)
        if token is not None:
            token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)


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
