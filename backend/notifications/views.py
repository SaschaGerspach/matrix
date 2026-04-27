from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from employees.utils import get_employee

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        employee = get_employee(self.request.user)
        if employee is None:
            return Notification.objects.none()
        return Notification.objects.filter(recipient=employee).select_related('actor')

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        employee = get_employee(request.user)
        if employee is None:
            return Response({'count': 0})
        count = Notification.objects.filter(recipient=employee, is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def read_all(self, request):
        employee = get_employee(request.user)
        if employee is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        Notification.objects.filter(recipient=employee, is_read=False).update(is_read=True)
        return Response({'status': 'ok'})
