from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from employees.models import Employee
from employees.utils import get_employee
from teams.models import Team
from teams.utils import is_team_lead

from ..models import SkillAssignment, SkillRequirement


class SkillGapsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        employee = get_employee(request.user)

        if request.user.is_staff:
            teams = Team.objects.prefetch_related('members').all()
        elif employee is not None and is_team_lead(request.user):
            teams = employee.led_teams.prefetch_related('members').all()
        else:
            return Response([])

        member_ids = set(teams.values_list('members__id', flat=True))

        requirements = SkillRequirement.objects.filter(
            team__in=teams,
        ).select_related('skill__category', 'team')

        assignments = SkillAssignment.objects.filter(
            employee_id__in=member_ids,
        ).select_related('skill', 'employee')
        assignment_map = {}
        for a in assignments:
            assignment_map.setdefault(a.employee_id, {})[a.skill_id] = a.level

        members = Employee.objects.filter(id__in=member_ids)
        member_teams = {}
        for team in teams:
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
