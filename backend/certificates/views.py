from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, JSONParser

from common.mixins import AuditMixin
from employees.utils import get_employee
from teams.utils import get_led_member_ids
from .models import Certificate
from .permissions import CertificatePermission
from .serializers import CertificateSerializer


class CertificateViewSet(AuditMixin, viewsets.ModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = (CertificatePermission,)
    parser_classes = (MultiPartParser, JSONParser)
    audit_entity_type = 'certificate'

    def get_queryset(self):
        qs = Certificate.objects.select_related('employee', 'skill')
        user = self.request.user
        if not user.is_staff:
            employee = get_employee(user)
            if employee is None:
                return qs.none()
            visible_ids = {employee.id} | get_led_member_ids(employee)
            qs = qs.filter(employee_id__in=visible_ids)
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs
