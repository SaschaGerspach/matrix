from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Department,
    Employee,
    Skill,
    SkillAssignment,
    SkillCategory,
    Team,
)
from .permissions import (
    CanConfirmSkillAssignment,
    IsAdminOrReadOnly,
    SkillAssignmentPermission,
    get_employee,
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
    permission_classes = (IsAdminOrReadOnly,)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = (IsAdminOrReadOnly,)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = (IsAdminOrReadOnly,)


class SkillCategoryViewSet(viewsets.ModelViewSet):
    queryset = SkillCategory.objects.all()
    serializer_class = SkillCategorySerializer
    permission_classes = (IsAdminOrReadOnly,)


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = (IsAdminOrReadOnly,)


class SkillAssignmentViewSet(viewsets.ModelViewSet):
    queryset = SkillAssignment.objects.all()
    serializer_class = SkillAssignmentSerializer
    permission_classes = (SkillAssignmentPermission,)

    @action(detail=True, methods=['post'], permission_classes=(CanConfirmSkillAssignment,))
    def confirm(self, request, pk=None):
        assignment = self.get_object()
        if assignment.status == SkillAssignment.Status.CONFIRMED:
            return Response({'detail': 'Already confirmed.'}, status=400)
        employee = get_employee(request.user)
        assignment.status = SkillAssignment.Status.CONFIRMED
        assignment.confirmed_by = employee
        assignment.confirmed_at = timezone.now()
        assignment.save()
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)
