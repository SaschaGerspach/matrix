from django.urls import path

from .views import ChangePasswordView, LogoutView, ThrottledObtainAuthToken

urlpatterns = [
    path('auth/login/', ThrottledObtainAuthToken.as_view(), name='api-login'),
    path('auth/logout/', LogoutView.as_view(), name='api-logout'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='api-change-password'),
]
