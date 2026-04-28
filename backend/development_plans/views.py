from rest_framework import viewsets

from common.mixins import AuditMixin
from .models import DevelopmentGoal, DevelopmentPlan
from .permissions import DevelopmentGoalPermission, DevelopmentPlanPermission
from .serializers import DevelopmentGoalSerializer, DevelopmentPlanSerializer


class DevelopmentPlanViewSet(AuditMixin, viewsets.ModelViewSet):
    serializer_class = DevelopmentPlanSerializer
    permission_classes = (DevelopmentPlanPermission,)
    audit_entity_type = 'development_plan'

    def get_queryset(self):
        qs = DevelopmentPlan.objects.select_related('employee').prefetch_related(
            'goals__skill__category',
        )
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
        plan_id = self.request.query_params.get('plan')
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        return qs
