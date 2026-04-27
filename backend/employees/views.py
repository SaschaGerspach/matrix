from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdminOrReadOnly
from teams.utils import is_team_lead

from .models import Employee
from .serializers import EmployeeSerializer
from .utils import get_employee


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = (IsAdminOrReadOnly,)


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
