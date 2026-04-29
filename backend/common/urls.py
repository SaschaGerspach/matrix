from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AuditLogViewSet, TaskStatusView

router = DefaultRouter()
router.register('audit-log', AuditLogViewSet)

urlpatterns = [
    path('tasks/<str:task_id>/status/', TaskStatusView.as_view(), name='task-status'),
] + router.urls
