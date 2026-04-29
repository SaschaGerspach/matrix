from rest_framework import serializers

from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = ('id', 'first_name', 'last_name', 'full_name', 'email')

    def get_full_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'
