from rest_framework import status as http_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import SkillAssignmentHistory
from ._helpers import can_view_employee_data


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
