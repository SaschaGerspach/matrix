from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AuditLogViewSet, HealthCheckView, TaskStatusView

router = DefaultRouter()
router.register('audit-log', AuditLogViewSet)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('tasks/<str:task_id>/status/', TaskStatusView.as_view(), name='task-status'),
] + router.urls
