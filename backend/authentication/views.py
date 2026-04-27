from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        token = getattr(request.user, 'auth_token', None)
        if token is not None:
            token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
