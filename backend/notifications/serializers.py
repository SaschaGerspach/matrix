from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ('id', 'type', 'message', 'is_read', 'actor', 'actor_name', 'created_at')
        read_only_fields = fields

    def get_actor_name(self, obj):
        return str(obj.actor) if obj.actor else None
