from rest_framework import serializers

from core.permissions import get_employee, get_led_member_ids

from .models import Skill, SkillAssignment, SkillCategory


class SkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = ('id', 'name', 'parent')


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ('id', 'name', 'category')


class SkillAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillAssignment
        fields = (
            'id',
            'employee',
            'skill',
            'level',
            'status',
            'confirmed_by',
            'confirmed_at',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('status', 'confirmed_by', 'confirmed_at', 'created_at', 'updated_at')

    def validate_level(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('Level must be between 1 and 5.')
        return value

    def validate_employee(self, value):
        request = self.context['request']
        if request.user.is_staff:
            return value
        employee = get_employee(request.user)
        if employee is None:
            raise serializers.ValidationError('Your user is not linked to an employee.')
        if value.id == employee.id:
            return value
        if value.id in get_led_member_ids(employee):
            return value
        raise serializers.ValidationError('You can only assign skills to yourself or your team members.')
