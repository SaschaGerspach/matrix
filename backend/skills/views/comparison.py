from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdminOrTeamLead

from ..models import Skill, SkillAssignment


class TeamComparisonView(APIView):
    permission_classes = (IsAdminOrTeamLead,)

    MAX_TEAMS = 10

    def get(self, request):
        from teams.models import Team

        raw_ids = request.query_params.getlist('teams')
        if not raw_ids:
            return Response([])

        team_ids = []
        for raw in raw_ids[:self.MAX_TEAMS]:
            try:
                team_ids.append(int(raw))
            except (ValueError, TypeError):
                continue
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
