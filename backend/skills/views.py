import csv
import io

from django.db import models
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import serializers, status as http_status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.audit import log_action
from common.mixins import AuditMixin
from common.models import AuditLog
from common.permissions import IsAdminOrReadOnly
from employees.utils import get_employee

from .models import Skill, SkillAssignment, SkillAssignmentHistory, SkillCategory, SkillLevelDescription, SkillRequirement, RoleTemplate, RoleTemplateSkill
from .permissions import CanConfirmSkillAssignment, SkillAssignmentPermission
from teams.utils import get_led_member_ids, is_team_lead

from employees.models import Employee
from notifications.utils import notify_skill_confirmed, notify_skill_updated, notify_team_leads_pending

from .serializers import (
    MatrixAssignmentSerializer,
    MatrixEmployeeSerializer,
    MatrixSkillSerializer,
    MySkillAssignmentSerializer,
    RoleTemplateApplySerializer,
    RoleTemplateSerializer,
    RoleTemplateSkillSerializer,
    SkillAssignmentHistorySerializer,
    SkillAssignmentSerializer,
    SkillCategorySerializer,
    SkillLevelDescriptionSerializer,
    SkillRequirementSerializer,
    SkillSerializer,
    TeamAssignmentSerializer,
)


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


class SkillMatrixView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from teams.models import Team

        employees = Employee.objects.all().order_by('last_name', 'first_name')
        skills = Skill.objects.select_related('category').order_by('category__name', 'name')

        team_id = request.query_params.get('team')
        if team_id:
            team = Team.objects.filter(id=team_id).first()
            if team:
                employees = employees.filter(teams=team)

        category_id = request.query_params.get('category')
        if category_id:
            skills = skills.filter(category_id=category_id)

        search = request.query_params.get('search', '').strip()
        if search:
            employees = employees.filter(
                models.Q(first_name__icontains=search) | models.Q(last_name__icontains=search)
            )

        employee_ids = list(employees.values_list('id', flat=True))
        skill_ids = list(skills.values_list('id', flat=True))

        assignments = SkillAssignment.objects.filter(
            employee_id__in=employee_ids,
            skill_id__in=skill_ids,
        )

        employee_data = [
            {'id': e.id, 'full_name': str(e)} for e in employees
        ]
        skill_data = [
            {'id': s.id, 'name': s.name, 'category_name': s.category.name} for s in skills
        ]

        return Response({
            'employees': MatrixEmployeeSerializer(employee_data, many=True).data,
            'skills': MatrixSkillSerializer(skill_data, many=True).data,
            'assignments': MatrixAssignmentSerializer(assignments, many=True).data,
        })


class SkillMatrixExportView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        employees = list(Employee.objects.all().order_by('last_name', 'first_name'))
        skills = list(Skill.objects.select_related('category').order_by('category__name', 'name'))
        assignments = SkillAssignment.objects.all()

        assignment_map = {}
        for a in assignments:
            assignment_map.setdefault(a.employee_id, {})[a.skill_id] = a.level

        buf = io.StringIO()
        writer = csv.writer(buf)

        header = ['Employee'] + [s.name for s in skills]
        writer.writerow(header)

        for emp in employees:
            row = [str(emp)]
            emp_skills = assignment_map.get(emp.id, {})
            for s in skills:
                level = emp_skills.get(s.id)
                row.append(str(level) if level else '')
            writer.writerow(row)

        response = HttpResponse(buf.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="skill-matrix.csv"'
        return response


class SkillMatrixPdfExportView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import landscape, A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

        employees = list(Employee.objects.all().order_by('last_name', 'first_name'))
        skills = list(Skill.objects.select_related('category').order_by('category__name', 'name'))
        assignments = SkillAssignment.objects.all()

        assignment_map: dict = {}
        for a in assignments:
            assignment_map.setdefault(a.employee_id, {})[a.skill_id] = a.level

        header = ['Employee'] + [s.name for s in skills]
        data = [header]
        for emp in employees:
            row = [str(emp)]
            emp_skills = assignment_map.get(emp.id, {})
            for s in skills:
                level = emp_skills.get(s.id)
                row.append(str(level) if level else '')
            data.append(row)

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=landscape(A4))
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))
        doc.build([table])

        response = HttpResponse(buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="skill-matrix.pdf"'
        return response


class SkillRequirementViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = SkillRequirement.objects.select_related('skill__category', 'team')
    serializer_class = SkillRequirementSerializer
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None
    audit_entity_type = 'SkillRequirement'


class SkillGapsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        employee = get_employee(request.user)
        if employee is None or not is_team_lead(request.user):
            return Response([])

        member_ids = get_led_member_ids(employee)
        led_teams = employee.led_teams.all()

        requirements = SkillRequirement.objects.filter(
            team__in=led_teams,
        ).select_related('skill__category', 'team')

        assignments = SkillAssignment.objects.filter(
            employee_id__in=member_ids,
        ).select_related('skill', 'employee')
        assignment_map = {}
        for a in assignments:
            assignment_map.setdefault(a.employee_id, {})[a.skill_id] = a.level

        members = Employee.objects.filter(id__in=member_ids)
        member_teams = {}
        for team in led_teams:
            for mid in team.members.values_list('id', flat=True):
                member_teams.setdefault(mid, set()).add(team.id)

        gaps = []
        for member in members:
            team_ids = member_teams.get(member.id, set())
            for req in requirements:
                if req.team_id not in team_ids:
                    continue
                actual = assignment_map.get(member.id, {}).get(req.skill_id, 0)
                if actual < req.required_level:
                    gaps.append({
                        'employee_id': member.id,
                        'employee_name': str(member),
                        'team_name': req.team.name,
                        'skill_id': req.skill_id,
                        'skill_name': req.skill.name,
                        'category_name': req.skill.category.name,
                        'required_level': req.required_level,
                        'actual_level': actual,
                        'gap': req.required_level - actual,
                    })

        gaps.sort(key=lambda g: (-g['gap'], g['employee_name']))
        return Response(gaps)


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


class TeamComparisonView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from teams.models import Team

        team_ids = request.query_params.getlist('teams')
        if not team_ids:
            return Response([])

        teams = list(Team.objects.filter(id__in=team_ids).prefetch_related('members'))
        skills = Skill.objects.select_related('category').order_by('category__name', 'name')

        team_member_ids = {}
        all_member_ids = set()
        for team in teams:
            ids = set(team.members.values_list('id', flat=True))
            team_member_ids[team.id] = ids
            all_member_ids |= ids

        assignments = SkillAssignment.objects.filter(employee_id__in=all_member_ids)
        assignment_map: dict = {}
        for a in assignments:
            assignment_map.setdefault(a.skill_id, {})[a.employee_id] = a.level

        result = []
        for skill in skills:
            entry = {'skill_id': skill.id, 'skill_name': skill.name, 'category_name': skill.category.name, 'teams': {}}
            skill_assignments = assignment_map.get(skill.id, {})
            for team in teams:
                members = team_member_ids[team.id]
                if not members:
                    entry['teams'][team.name] = None
                    continue
                levels = [skill_assignments[mid] for mid in members if mid in skill_assignments]
                entry['teams'][team.name] = round(sum(levels) / len(members), 2) if levels else 0
            result.append(entry)

        return Response(result)


def can_view_employee_data(user, target_employee_id):
    if user.is_staff:
        return True
    employee = get_employee(user)
    if employee is None:
        return False
    if employee.id == target_employee_id:
        return True
    return target_employee_id in get_led_member_ids(employee)


class SkillTrendsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        employee_id = request.query_params.get('employee')
        if not employee_id:
            return Response([])

        try:
            employee_id = int(employee_id)
        except (ValueError, TypeError):
            return Response([])

        if not can_view_employee_data(request.user, employee_id):
            return Response(
                {'detail': 'Not authorized to view this employee data.'},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        entries = SkillAssignmentHistory.objects.filter(
            employee_id=employee_id,
            action__in=['created', 'updated'],
        ).select_related('skill').order_by('timestamp')

        skills_data: dict = {}
        for entry in entries:
            name = entry.skill.name
            if name not in skills_data:
                skills_data[name] = []
            skills_data[name].append({
                'date': entry.timestamp.isoformat(),
                'level': entry.new_level,
            })

        result = [
            {'skill_name': name, 'points': points}
            for name, points in skills_data.items()
        ]
        return Response(result)


class SkillRecommendationsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        employee = get_employee(request.user)
        if employee is None:
            return Response([])

        team_ids = list(employee.teams.values_list('id', flat=True))
        requirements = SkillRequirement.objects.filter(
            team_id__in=team_ids,
        ).select_related('skill__category', 'team')

        assignments = SkillAssignment.objects.filter(employee=employee)
        assignment_map = {a.skill_id: a.level for a in assignments}

        recommendations = []
        seen_skills = set()
        for req in requirements:
            if req.skill_id in seen_skills:
                continue
            actual = assignment_map.get(req.skill_id, 0)
            if actual < req.required_level:
                seen_skills.add(req.skill_id)
                recommendations.append({
                    'skill_id': req.skill_id,
                    'skill_name': req.skill.name,
                    'category_name': req.skill.category.name,
                    'team_name': req.team.name,
                    'current_level': actual,
                    'required_level': req.required_level,
                    'gap': req.required_level - actual,
                    'priority': 'high' if req.required_level - actual >= 3 else
                                'medium' if req.required_level - actual >= 2 else 'low',
                })

        recommendations.sort(key=lambda r: (-r['gap'], r['skill_name']))
        return Response(recommendations)


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


class KpiView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from teams.models import Team

        teams = list(Team.objects.prefetch_related('members').all())
        total_skills = Skill.objects.count()

        all_member_ids = set()
        team_member_ids = {}
        for team in teams:
            ids = set(team.members.values_list('id', flat=True))
            team_member_ids[team.id] = ids
            all_member_ids |= ids

        assignments = SkillAssignment.objects.filter(employee_id__in=all_member_ids)
        emp_assignments: dict = {}
        for a in assignments:
            emp_assignments.setdefault(a.employee_id, []).append(a)

        result = []
        for team in teams:
            members = team_member_ids[team.id]
            member_count = len(members)
            if member_count == 0:
                result.append({
                    'team_id': team.id, 'team_name': team.name,
                    'member_count': 0, 'avg_level': 0, 'coverage': 0,
                    'total_assignments': 0, 'confirmed_ratio': 0,
                })
                continue

            team_assignments = [a for mid in members for a in emp_assignments.get(mid, [])]
            total_assignments = len(team_assignments)
            if total_assignments == 0:
                result.append({
                    'team_id': team.id, 'team_name': team.name,
                    'member_count': member_count, 'avg_level': 0, 'coverage': 0,
                    'total_assignments': 0, 'confirmed_ratio': 0,
                })
                continue

            confirmed_count = sum(1 for a in team_assignments if a.status == SkillAssignment.Status.CONFIRMED)
            avg_level = round(sum(a.level for a in team_assignments) / total_assignments, 2)
            unique_skills = len({a.skill_id for a in team_assignments})
            coverage = round(unique_skills / total_skills * 100, 1) if total_skills else 0

            result.append({
                'team_id': team.id,
                'team_name': team.name,
                'member_count': member_count,
                'avg_level': avg_level,
                'coverage': coverage,
                'total_assignments': total_assignments,
                'confirmed_ratio': round(confirmed_count / total_assignments * 100, 1),
            })

        return Response(result)


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
