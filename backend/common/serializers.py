from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', default=None)

    class Meta:
        model = AuditLog
        fields = ('id', 'username', 'action', 'entity_type', 'entity_id', 'detail', 'timestamp')
