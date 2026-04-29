import csv
import hashlib
import io

from django.core.cache import cache
from django.db import models
from django.http import HttpResponse
from rest_framework import status as http_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from employees.models import Employee
from employees.utils import get_employee
from teams.utils import get_led_member_ids, is_team_lead

from ..models import Skill, SkillAssignment, SkillAssignmentHistory, SkillRequirement
from ..serializers import MatrixAssignmentSerializer, MatrixEmployeeSerializer, MatrixSkillSerializer

CACHE_TTL = 300

CACHE_KEYS_PREFIX = 'analytics_'
CACHE_KEYS_REGISTRY = 'analytics_known_keys'


def _cache_key(view_name, **params):
    raw = f"{view_name}:{sorted(params.items())}"
    return CACHE_KEYS_PREFIX + hashlib.sha256(raw.encode()).hexdigest()


def _register_cache_key(key):
    known = cache.get(CACHE_KEYS_REGISTRY) or set()
    known.add(key)
    cache.set(CACHE_KEYS_REGISTRY, known, None)


def invalidate_analytics_cache():
    if hasattr(cache, 'delete_pattern'):
        cache.delete_pattern(f'{CACHE_KEYS_PREFIX}*')
    else:
        known = cache.get(CACHE_KEYS_REGISTRY) or set()
        for key in known:
            cache.delete(key)
        cache.delete(CACHE_KEYS_REGISTRY)


def can_view_employee_data(user, target_employee_id):
    if user.is_staff:
        return True
    employee = get_employee(user)
    if employee is None:
        return False
    if employee.id == target_employee_id:
        return True
    return target_employee_id in get_led_member_ids(employee)


def _build_export_data():
    employees = list(Employee.objects.all().order_by('last_name', 'first_name'))
    skills = list(Skill.objects.select_related('category').order_by('category__name', 'name'))

    assignment_map = {}
    for a in SkillAssignment.objects.only('employee_id', 'skill_id', 'level').iterator():
        assignment_map.setdefault(a.employee_id, {})[a.skill_id] = a.level

    return employees, skills, assignment_map


class SkillMatrixView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from teams.models import Team

        team_id = request.query_params.get('team', '')
        category_id = request.query_params.get('category', '')
        search = request.query_params.get('search', '').strip()

        key = _cache_key('matrix', team=team_id, category=category_id, search=search)
        cached = cache.get(key)
        if cached is not None:
            return Response(cached)

        employees = Employee.objects.all().order_by('last_name', 'first_name')
        skills = Skill.objects.select_related('category').order_by('category__name', 'name')

        if team_id:
            team = Team.objects.filter(id=team_id).first()
            if team:
                employees = employees.filter(teams=team)

        if category_id:
            skills = skills.filter(category_id=category_id)

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

        data = {
            'employees': MatrixEmployeeSerializer(employee_data, many=True).data,
            'skills': MatrixSkillSerializer(skill_data, many=True).data,
            'assignments': MatrixAssignmentSerializer(assignments, many=True).data,
        }
        _register_cache_key(key)
        cache.set(key, data, CACHE_TTL)
        return Response(data)


class SkillMatrixExportView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        employees, skills, assignment_map = _build_export_data()

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

        employees, skills, assignment_map = _build_export_data()

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


class SkillGapsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        employee = get_employee(request.user)
        if employee is None or not is_team_lead(request.user):
            return Response([])

        member_ids = get_led_member_ids(employee)
        led_teams = employee.led_teams.prefetch_related('members').all()

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
            for m in team.members.all():
                member_teams.setdefault(m.id, set()).add(team.id)

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
            ids = {m.id for m in team.members.all()}
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


class KpiView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from teams.models import Team

        key = _cache_key('kpi')
        cached = cache.get(key)
        if cached is not None:
            return Response(cached)

        teams = list(Team.objects.prefetch_related('members').all())
        total_skills = Skill.objects.count()

        all_member_ids = set()
        team_member_ids = {}
        for team in teams:
            ids = {m.id for m in team.members.all()}
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

        _register_cache_key(key)
        cache.set(key, result, CACHE_TTL)
        return Response(result)


class LevelDistributionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from teams.models import Team

        key = _cache_key('level_distribution')
        cached = cache.get(key)
        if cached is not None:
            return Response(cached)

        teams = list(Team.objects.prefetch_related('members').all())

        all_member_ids = set()
        team_member_ids = {}
        for team in teams:
            ids = {m.id for m in team.members.all()}
            team_member_ids[team.id] = ids
            all_member_ids |= ids

        assignments = SkillAssignment.objects.filter(employee_id__in=all_member_ids)
        emp_assignments: dict = {}
        for a in assignments:
            emp_assignments.setdefault(a.employee_id, []).append(a)

        overall = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}
        per_team = []

        for team in teams:
            members = team_member_ids[team.id]
            dist = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}
            for mid in members:
                for a in emp_assignments.get(mid, []):
                    if 1 <= a.level <= 5:
                        dist[str(a.level)] += 1
                        overall[str(a.level)] += 1
            per_team.append({
                'team_id': team.id,
                'team_name': team.name,
                'distribution': dist,
            })

        data = {
            'overall': overall,
            'teams': per_team,
        }
        _register_cache_key(key)
        cache.set(key, data, CACHE_TTL)
        return Response(data)
