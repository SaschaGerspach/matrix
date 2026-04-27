from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import EmployeeViewSet, MeView

router = DefaultRouter()
router.register('employees', EmployeeViewSet)

urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
] + router.urls
