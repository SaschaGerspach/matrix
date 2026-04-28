from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, JSONParser

from common.mixins import AuditMixin
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
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs
