from rest_framework import serializers

from .models import Certificate


class CertificateSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.__str__', read_only=True)
    skill_name = serializers.CharField(source='skill.name', read_only=True, default=None)

    class Meta:
        model = Certificate
        fields = (
            'id', 'employee', 'employee_name', 'skill', 'skill_name',
            'name', 'issuer', 'issued_date', 'expiry_date', 'file', 'created_at',
        )
        read_only_fields = ('created_at',)

    def validate_employee(self, value):
        if self.instance is not None and self.instance.employee_id != value.id:
            raise serializers.ValidationError('Employee cannot be changed after creation.')
        return value
