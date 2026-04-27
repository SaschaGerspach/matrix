from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from rest_framework.permissions import IsAuthenticated

from common.permissions import IsAdminOrReadOnly
from employees.utils import get_employee

from .models import Skill, SkillAssignment, SkillCategory
from .permissions import CanConfirmSkillAssignment, SkillAssignmentPermission
from teams.utils import get_led_member_ids, is_team_lead

from .serializers import (
    MySkillAssignmentSerializer,
    SkillAssignmentSerializer,
    SkillCategorySerializer,
    SkillSerializer,
    TeamAssignmentSerializer,
)


class MySkillsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MySkillAssignmentSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        employee = get_employee(self.request.user)
        if employee is None:
            return SkillAssignment.objects.none()
        return SkillAssignment.objects.filter(employee=employee).select_related('skill__category')


class TeamAssignmentsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TeamAssignmentSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        employee = get_employee(self.request.user)
        if employee is None or not is_team_lead(self.request.user):
            return SkillAssignment.objects.none()
        member_ids = get_led_member_ids(employee)
        qs = SkillAssignment.objects.filter(
            employee_id__in=member_ids,
        ).select_related('skill__category', 'employee')
        if self.request.query_params.get('status'):
            qs = qs.filter(status=self.request.query_params['status'])
        return qs


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
