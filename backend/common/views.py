from celery.result import AsyncResult
from django.db import connection
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = (IsAdminUser,)


class HealthCheckView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request):
        checks = {}

        try:
            connection.ensure_connection()
            checks['database'] = 'ok'
        except Exception:
            checks['database'] = 'error'

        try:
            from django.core.cache import cache
            cache.set('health_check', 'ok', 10)
            checks['cache'] = 'ok' if cache.get('health_check') == 'ok' else 'error'
        except Exception:
            checks['cache'] = 'error'

        healthy = all(v == 'ok' for v in checks.values())
        return Response(
            {'status': 'healthy' if healthy else 'unhealthy', 'checks': checks},
            status=200 if healthy else 503,
        )


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
