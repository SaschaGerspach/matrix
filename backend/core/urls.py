from django.urls import include, path

urlpatterns = [
    path('', include('employees.urls')),
    path('', include('teams.urls')),
    path('', include('skills.urls')),
]
