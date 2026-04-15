from rest_framework import serializers

from .models import (
    Department,
    Employee,
    Skill,
    SkillAssignment,
    SkillCategory,
    Team,
)


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ('id', 'name', 'parent')


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = ('id', 'first_name', 'last_name', 'full_name', 'email', 'user')

    def get_full_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ('id', 'name', 'department', 'members', 'team_leads')


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
