import csv
import io

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdminOrReadOnly
from employees.utils import get_employee

from .models import Skill, SkillAssignment, SkillCategory, SkillRequirement
from .permissions import CanConfirmSkillAssignment, SkillAssignmentPermission
from teams.utils import get_led_member_ids, is_team_lead

from employees.models import Employee

from .serializers import (
    MatrixAssignmentSerializer,
    MatrixEmployeeSerializer,
    MatrixSkillSerializer,
    MySkillAssignmentSerializer,
    SkillAssignmentSerializer,
    SkillCategorySerializer,
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


class SkillCategoryViewSet(viewsets.ModelViewSet):
    queryset = SkillCategory.objects.all()
    serializer_class = SkillCategorySerializer
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None


class SkillMatrixView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        employees = Employee.objects.all().order_by('last_name', 'first_name')
        skills = Skill.objects.select_related('category').order_by('category__name', 'name')
        assignments = SkillAssignment.objects.all()

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


class SkillRequirementViewSet(viewsets.ModelViewSet):
    queryset = SkillRequirement.objects.select_related('skill__category', 'team')
    serializer_class = SkillRequirementSerializer
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None


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
