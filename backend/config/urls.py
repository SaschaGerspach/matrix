from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('authentication.urls')),
    path('api/', include('employees.urls')),
    path('api/', include('teams.urls')),
    path('api/', include('skills.urls')),
    path('api/', include('notifications.urls')),
]
