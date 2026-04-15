from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import (
    Department,
    Employee,
    Skill,
    SkillAssignment,
    SkillCategory,
    Team,
)
from .serializers import (
    DepartmentSerializer,
    EmployeeSerializer,
    SkillAssignmentSerializer,
    SkillCategorySerializer,
    SkillSerializer,
    TeamSerializer,
)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = (IsAuthenticated,)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = (IsAuthenticated,)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = (IsAuthenticated,)


class SkillCategoryViewSet(viewsets.ModelViewSet):
    queryset = SkillCategory.objects.all()
    serializer_class = SkillCategorySerializer
    permission_classes = (IsAuthenticated,)


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = (IsAuthenticated,)


class SkillAssignmentViewSet(viewsets.ModelViewSet):
    queryset = SkillAssignment.objects.all()
    serializer_class = SkillAssignmentSerializer
    permission_classes = (IsAuthenticated,)
