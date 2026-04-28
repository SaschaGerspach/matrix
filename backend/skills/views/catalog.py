import csv
import io

from rest_framework import status as http_status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from common.audit import log_action
from common.mixins import AuditMixin
from common.models import AuditLog
from common.permissions import IsAdminOrReadOnly

from ..models import Skill, SkillCategory, SkillLevelDescription, SkillRequirement, RoleTemplate, RoleTemplateSkill
from ..serializers import (
    RoleTemplateApplySerializer,
    RoleTemplateSerializer,
    RoleTemplateSkillSerializer,
    SkillCategorySerializer,
    SkillLevelDescriptionSerializer,
    SkillRequirementSerializer,
    SkillSerializer,
)


class SkillCategoryViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = SkillCategory.objects.all()
    serializer_class = SkillCategorySerializer
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None
    audit_entity_type = 'SkillCategory'


class SkillViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = Skill.objects.prefetch_related('level_descriptions').all()
    serializer_class = SkillSerializer
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None
    audit_entity_type = 'Skill'

    @action(detail=False, methods=['post'], parser_classes=(MultiPartParser,), url_path='import-csv')
    def import_csv(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided.'}, status=http_status.HTTP_400_BAD_REQUEST)

        try:
            decoded = file.read().decode('utf-8-sig')
        except UnicodeDecodeError:
            return Response({'detail': 'File must be UTF-8 encoded.'}, status=http_status.HTTP_400_BAD_REQUEST)

        required = {'name', 'category'}
        reader = csv.DictReader(io.StringIO(decoded))
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            return Response(
                {'detail': 'CSV must contain columns: category, name'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        created = []
        skipped = []
        errors = []
        category_cache: dict[str, SkillCategory] = {}
        existing = set(Skill.objects.values_list('name', 'category__name'))

        for i, row in enumerate(reader, start=2):
            name = (row.get('name') or '').strip()
            category_name = (row.get('category') or '').strip()

            if not name or not category_name:
                errors.append({'row': i, 'detail': 'Missing required field.'})
                continue

            if (name, category_name) in existing:
                skipped.append({'row': i, 'name': name})
                continue

            if category_name not in category_cache:
                cat, _ = SkillCategory.objects.get_or_create(name=category_name)
                category_cache[category_name] = cat

            Skill.objects.create(name=name, category=category_cache[category_name])
            existing.add((name, category_name))
            created.append({'row': i, 'name': name, 'category': category_name})

        if created:
            log_action(
                user=request.user,
                action=AuditLog.Action.IMPORT,
                entity_type='Skill',
                detail=f'Imported {len(created)} skills',
            )

        return Response({
            'created': len(created),
            'skipped': len(skipped),
            'errors': errors,
            'details': {'created': created, 'skipped': skipped},
        })


class SkillLevelDescriptionViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = SkillLevelDescription.objects.select_related('skill')
    serializer_class = SkillLevelDescriptionSerializer
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None
    audit_entity_type = 'SkillLevelDescription'


class SkillRequirementViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = SkillRequirement.objects.select_related('skill__category', 'team')
    serializer_class = SkillRequirementSerializer
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None
    audit_entity_type = 'SkillRequirement'


class RoleTemplateViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = RoleTemplate.objects.prefetch_related('skills__skill')
    serializer_class = RoleTemplateSerializer
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None
    audit_entity_type = 'RoleTemplate'

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        from teams.models import Team

        template = self.get_object()
        ser = RoleTemplateApplySerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        team = Team.objects.filter(id=ser.validated_data['team']).first()
        if not team:
            return Response({'detail': 'Team not found.'}, status=404)

        created = 0
        updated = 0
        for ts in template.skills.all():
            req, is_new = SkillRequirement.objects.update_or_create(
                team=team,
                skill=ts.skill,
                defaults={'required_level': ts.required_level},
            )
            if is_new:
                created += 1
            else:
                updated += 1

        log_action(
            user=request.user,
            action=AuditLog.Action.APPLY,
            entity_type='RoleTemplate',
            entity_id=template.pk,
            detail=f'Applied "{template.name}" to team "{team.name}": {created} created, {updated} updated',
        )

        return Response({'created': created, 'updated': updated})

    @action(detail=True, methods=['post'], url_path='add-skill')
    def add_skill(self, request, pk=None):
        template = self.get_object()
        ser = RoleTemplateSkillSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        instance = ser.save(template=template)
        log_action(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            entity_type='RoleTemplate',
            entity_id=template.pk,
            detail=f'Added skill {instance.skill.name} (level {instance.required_level}) to "{template.name}"',
        )
        template = self.get_queryset().get(pk=template.pk)
        return Response(RoleTemplateSerializer(template).data)

    @action(detail=True, methods=['delete'], url_path='remove-skill/(?P<skill_pk>[0-9]+)')
    def remove_skill(self, request, pk=None, skill_pk=None):
        template = self.get_object()
        skill_entry = RoleTemplateSkill.objects.filter(template=template, pk=skill_pk).first()
        if skill_entry:
            detail = f'Removed skill {skill_entry.skill.name} from "{template.name}"'
            skill_entry.delete()
            log_action(
                user=request.user,
                action=AuditLog.Action.UPDATE,
                entity_type='RoleTemplate',
                entity_id=template.pk,
                detail=detail,
            )
        template = self.get_queryset().get(pk=template.pk)
        return Response(RoleTemplateSerializer(template).data)
