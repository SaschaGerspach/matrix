from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('authentication.urls')),
    path('api/', include('employees.urls')),
    path('api/', include('teams.urls')),
    path('api/', include('skills.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('certificates.urls')),
    path('api/', include('development_plans.urls')),
    path('api/', include('skill_proposals.urls')),
    path('api/', include('common.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
