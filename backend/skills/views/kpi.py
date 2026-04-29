from django.core.cache import cache
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdminOrTeamLead

from ..models import Skill, SkillAssignment
from ._cache import CACHE_TTL, _cache_key, _register_cache_key


class KpiView(APIView):
    permission_classes = (IsAdminOrTeamLead,)

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
    permission_classes = (IsAdminOrTeamLead,)

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
