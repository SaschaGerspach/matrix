from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from employees.utils import get_employee
from notifications.utils import notify_skill_confirmed, notify_skill_updated, notify_team_leads_pending
from teams.utils import get_led_member_ids, is_team_lead

from ..models import SkillAssignment, SkillAssignmentHistory
from ..permissions import CanConfirmSkillAssignment, SkillAssignmentPermission
from ..serializers import (
    MySkillAssignmentSerializer,
    SkillAssignmentHistorySerializer,
    SkillAssignmentSerializer,
    TeamAssignmentSerializer,
)
from .analytics import can_view_employee_data


class MySkillsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MySkillAssignmentSerializer
    permission_classes = (IsAuthenticated,)
    pagination_class = None

    def get_queryset(self):
        employee = get_employee(self.request.user)
        if employee is None:
            return SkillAssignment.objects.none()
        return SkillAssignment.objects.filter(employee=employee).select_related('skill__category')


class TeamAssignmentsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TeamAssignmentSerializer
    permission_classes = (IsAuthenticated,)
    pagination_class = None

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


class SkillAssignmentViewSet(viewsets.ModelViewSet):
    queryset = SkillAssignment.objects.all()
    serializer_class = SkillAssignmentSerializer
    permission_classes = (SkillAssignmentPermission,)

    def perform_create(self, serializer):
        assignment = serializer.save()
        SkillAssignmentHistory.objects.create(
            assignment=assignment,
            employee=assignment.employee,
            skill=assignment.skill,
            old_level=None,
            new_level=assignment.level,
            action=SkillAssignmentHistory.Action.CREATED,
            changed_by=get_employee(self.request.user),
        )
        notify_team_leads_pending(assignment.employee, assignment.skill, assignment.level)

    def perform_update(self, serializer):
        old_level = serializer.instance.level
        assignment = serializer.save()
        changed_by = get_employee(self.request.user)
        if old_level != assignment.level:
            SkillAssignmentHistory.objects.create(
                assignment=assignment,
                employee=assignment.employee,
                skill=assignment.skill,
                old_level=old_level,
                new_level=assignment.level,
                action=SkillAssignmentHistory.Action.UPDATED,
                changed_by=changed_by,
            )
            notify_skill_updated(assignment.employee, assignment.skill, old_level, assignment.level, changed_by)

    def perform_destroy(self, instance):
        SkillAssignmentHistory.objects.create(
            assignment=None,
            employee=instance.employee,
            skill=instance.skill,
            old_level=instance.level,
            new_level=None,
            action=SkillAssignmentHistory.Action.DELETED,
            changed_by=get_employee(self.request.user),
        )
        instance.delete()

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
        SkillAssignmentHistory.objects.create(
            assignment=assignment,
            employee=assignment.employee,
            skill=assignment.skill,
            old_level=assignment.level,
            new_level=assignment.level,
            action=SkillAssignmentHistory.Action.CONFIRMED,
            changed_by=employee,
        )
        notify_skill_confirmed(assignment.employee, assignment.skill, employee)
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)


class SkillHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SkillAssignmentHistorySerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        qs = SkillAssignmentHistory.objects.select_related(
            'employee', 'skill__category', 'changed_by',
        )
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            try:
                employee_id = int(employee_id)
            except (ValueError, TypeError):
                return qs.none()
            if not can_view_employee_data(self.request.user, employee_id):
                return qs.none()
            return qs.filter(employee_id=employee_id)

        if self.request.user.is_staff:
            return qs
        employee = get_employee(self.request.user)
        if employee is None:
            return qs.none()
        visible_ids = get_led_member_ids(employee) | {employee.id}
        return qs.filter(employee_id__in=visible_ids)
