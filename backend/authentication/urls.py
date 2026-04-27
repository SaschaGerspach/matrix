from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token

from .views import LogoutView

urlpatterns = [
    path('auth/login/', obtain_auth_token, name='api-login'),
    path('auth/logout/', LogoutView.as_view(), name='api-logout'),
]
