import csv
import io

from django.core.cache import cache
from django.db import models
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdminOrTeamLead
from employees.models import Employee

from ..models import Skill, SkillAssignment
from ..serializers import MatrixAssignmentSerializer, MatrixEmployeeSerializer, MatrixSkillSerializer
from ._cache import CACHE_TTL, _cache_key, _register_cache_key
from ._helpers import build_export_data


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
    permission_classes = (IsAdminOrTeamLead,)

    def get(self, request):
        employees, skills, assignment_map = build_export_data()

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
    permission_classes = (IsAdminOrTeamLead,)

    def get(self, request):
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

        employees, skills, assignment_map = build_export_data()

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
