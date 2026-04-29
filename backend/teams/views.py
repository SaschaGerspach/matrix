from rest_framework import viewsets

from common.permissions import IsAdminOrReadOnly

from .models import Department, Team
from .serializers import DepartmentSerializer, TeamSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related('parent')
    serializer_class = DepartmentSerializer
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.select_related('department').prefetch_related('members', 'team_leads')
    serializer_class = TeamSerializer
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None
