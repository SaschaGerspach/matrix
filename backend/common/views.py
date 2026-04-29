from celery.result import AsyncResult
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = (IsAdminUser,)


class TaskStatusView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, task_id):
        result = AsyncResult(task_id)
        response = {
            'task_id': task_id,
            'status': result.status,
        }
        if result.ready():
            if result.successful():
                response['result'] = result.result
            else:
                response['error'] = str(result.result)
        return Response(response)
