from django.urls import path

from .views import ChangePasswordView, LoginView, LogoutView, RefreshView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='api-login'),
    path('auth/refresh/', RefreshView.as_view(), name='api-refresh'),
    path('auth/logout/', LogoutView.as_view(), name='api-logout'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='api-change-password'),
]
