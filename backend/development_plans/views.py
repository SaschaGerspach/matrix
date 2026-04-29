from rest_framework import viewsets

from common.mixins import AuditMixin
from employees.utils import get_employee
from teams.utils import get_led_member_ids
from .models import DevelopmentGoal, DevelopmentPlan
from .permissions import DevelopmentGoalPermission, DevelopmentPlanPermission
from .serializers import DevelopmentGoalSerializer, DevelopmentPlanSerializer


class DevelopmentPlanViewSet(AuditMixin, viewsets.ModelViewSet):
    serializer_class = DevelopmentPlanSerializer
    permission_classes = (DevelopmentPlanPermission,)
    audit_entity_type = 'development_plan'

    def _visible_employee_ids(self):
        user = self.request.user
        if user.is_staff:
            return None
        employee = get_employee(user)
        if employee is None:
            return set()
        return {employee.id} | get_led_member_ids(employee)

    def get_queryset(self):
        qs = DevelopmentPlan.objects.select_related('employee').prefetch_related(
            'goals__skill__category',
        )
        visible = self._visible_employee_ids()
        if visible is not None:
            qs = qs.filter(employee_id__in=visible)
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs


class DevelopmentGoalViewSet(AuditMixin, viewsets.ModelViewSet):
    serializer_class = DevelopmentGoalSerializer
    permission_classes = (DevelopmentGoalPermission,)
    audit_entity_type = 'development_goal'

    def get_queryset(self):
        qs = DevelopmentGoal.objects.select_related('skill__category', 'plan__employee')
        user = self.request.user
        if not user.is_staff:
            employee = get_employee(user)
            if employee is None:
                return qs.none()
            visible = {employee.id} | get_led_member_ids(employee)
            qs = qs.filter(plan__employee_id__in=visible)
        plan_id = self.request.query_params.get('plan')
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        return qs
