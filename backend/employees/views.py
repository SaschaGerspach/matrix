from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdminOrReadOnly
from skills.models import SkillAssignment
from teams.utils import is_team_lead

from .models import Employee
from .serializers import EmployeeSerializer
from .utils import get_employee


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all().order_by('last_name', 'first_name')
    serializer_class = EmployeeSerializer
    permission_classes = (IsAdminOrReadOnly,)

    @action(detail=True, methods=['get'], permission_classes=(IsAuthenticated,))
    def profile(self, request, pk=None):
        employee = self.get_object()
        teams = employee.teams.all()
        assignments = SkillAssignment.objects.filter(
            employee=employee,
        ).select_related('skill__category')

        return Response({
            'id': employee.id,
            'first_name': employee.first_name,
            'last_name': employee.last_name,
            'full_name': str(employee),
            'email': employee.email,
            'teams': [{'id': t.id, 'name': t.name} for t in teams],
            'skills': [
                {
                    'id': a.id,
                    'skill_id': a.skill_id,
                    'skill_name': a.skill.name,
                    'category_name': a.skill.category.name,
                    'level': a.level,
                    'status': a.status,
                }
                for a in assignments
            ],
        })


class MeView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        employee = get_employee(request.user)
        if employee is None:
            return Response({'detail': 'No employee profile linked.'}, status=404)
        serializer = EmployeeSerializer(employee)
        data = serializer.data
        data['is_team_lead'] = is_team_lead(request.user)
        data['is_admin'] = request.user.is_staff
        return Response(data)
