from rest_framework import viewsets

from core.permissions import IsAdminOrReadOnly

from .models import Department, Team
from .serializers import DepartmentSerializer, TeamSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = (IsAdminOrReadOnly,)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = (IsAdminOrReadOnly,)
