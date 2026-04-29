from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.mixins import AuditMixin
from employees.utils import get_employee
from skills.models import Skill
from teams.utils import is_team_lead

from .models import SkillProposal
from .permissions import SkillProposalPermission
from .serializers import SkillProposalSerializer


class SkillProposalViewSet(AuditMixin, viewsets.ModelViewSet):
    serializer_class = SkillProposalSerializer
    permission_classes = (SkillProposalPermission,)
    audit_entity_type = 'skill_proposal'

    def get_queryset(self):
        qs = SkillProposal.objects.select_related(
            'proposed_by', 'category', 'reviewed_by',
        )
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if not self.request.user.is_staff and not is_team_lead(self.request.user):
            employee = get_employee(self.request.user)
            qs = qs.filter(proposed_by=employee) if employee else qs.none()
        return qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not request.user.is_staff and not is_team_lead(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        review_note = str(request.data.get('review_note', ''))[:2000]
        with transaction.atomic():
            try:
                proposal = SkillProposal.objects.select_for_update().get(pk=pk)
            except SkillProposal.DoesNotExist:
                return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
            if proposal.status != SkillProposal.Status.PENDING:
                return Response(
                    {'detail': 'Only pending proposals can be reviewed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            reviewer = get_employee(request.user)
            proposal.status = SkillProposal.Status.APPROVED
            proposal.reviewed_by = reviewer
            proposal.review_note = review_note
            proposal.reviewed_at = timezone.now()
            proposal.save()

        if proposal.category:
            _, created = Skill.objects.get_or_create(
                name=proposal.skill_name,
                category=proposal.category,
            )
            if created:
                from skills.views.analytics import invalidate_analytics_cache
                invalidate_analytics_cache()

        return Response(SkillProposalSerializer(proposal).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not request.user.is_staff and not is_team_lead(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        review_note = str(request.data.get('review_note', ''))[:2000]
        with transaction.atomic():
            try:
                proposal = SkillProposal.objects.select_for_update().get(pk=pk)
            except SkillProposal.DoesNotExist:
                return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
            if proposal.status != SkillProposal.Status.PENDING:
                return Response(
                    {'detail': 'Only pending proposals can be reviewed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            reviewer = get_employee(request.user)
            proposal.status = SkillProposal.Status.REJECTED
            proposal.reviewed_by = reviewer
            proposal.review_note = review_note
            proposal.reviewed_at = timezone.now()
            proposal.save()
        return Response(SkillProposalSerializer(proposal).data)
