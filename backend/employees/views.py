import csv
import io

from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.audit import log_action
from common.models import AuditLog
from common.permissions import IsAdminOrReadOnly
from skills.models import SkillAssignment
from teams.utils import is_team_lead

from .models import Employee
from .serializers import EmployeeSerializer
from .utils import get_employee

REQUIRED_CSV_COLUMNS = {'first_name', 'last_name', 'email'}


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all().order_by('last_name', 'first_name')
    serializer_class = EmployeeSerializer
    permission_classes = (IsAdminOrReadOnly,)

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', '').strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )
        return qs

    @action(detail=False, methods=['post'], parser_classes=(MultiPartParser,), url_path='import-csv')
    def import_csv(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = file.read().decode('utf-8-sig')
        except UnicodeDecodeError:
            return Response({'detail': 'File must be UTF-8 encoded.'}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(decoded))
        if not reader.fieldnames or not REQUIRED_CSV_COLUMNS.issubset(set(reader.fieldnames)):
            return Response(
                {'detail': f'CSV must contain columns: {", ".join(sorted(REQUIRED_CSV_COLUMNS))}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = []
        skipped = []
        errors = []
        existing_emails = set(Employee.objects.values_list('email', flat=True))

        for i, row in enumerate(reader, start=2):
            email = (row.get('email') or '').strip().lower()
            first_name = (row.get('first_name') or '').strip()
            last_name = (row.get('last_name') or '').strip()

            if not email or not first_name or not last_name:
                errors.append({'row': i, 'detail': 'Missing required field.'})
                continue

            if email in existing_emails:
                skipped.append({'row': i, 'email': email})
                continue

            try:
                serializers.EmailField().run_validators(email)
            except serializers.ValidationError:
                errors.append({'row': i, 'detail': f'Invalid email: {email}'})
                continue

            Employee.objects.create(first_name=first_name, last_name=last_name, email=email)
            existing_emails.add(email)
            created.append({'row': i, 'email': email})

        if created:
            log_action(
                user=request.user,
                action=AuditLog.Action.IMPORT,
                entity_type='Employee',
                detail=f'Imported {len(created)} employees',
            )

        return Response({
            'created': len(created),
            'skipped': len(skipped),
            'errors': errors,
            'details': {'created': created, 'skipped': skipped},
        }, status=status.HTTP_200_OK)

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
