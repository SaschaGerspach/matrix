from rest_framework import serializers

from employees.utils import get_employee
from teams.utils import get_led_member_ids

from .models import Skill, SkillAssignment, SkillAssignmentHistory, SkillCategory, SkillLevelDescription, SkillRequirement, RoleTemplate, RoleTemplateSkill


class SkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = ('id', 'name', 'parent')


class SkillLevelDescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillLevelDescription
        fields = ('id', 'skill', 'level', 'description')


class SkillSerializer(serializers.ModelSerializer):
    level_descriptions = SkillLevelDescriptionSerializer(many=True, read_only=True)

    class Meta:
        model = Skill
        fields = ('id', 'name', 'category', 'level_descriptions')


class MySkillAssignmentSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source='skill.name', read_only=True)
    category_name = serializers.CharField(source='skill.category.name', read_only=True)

    class Meta:
        model = SkillAssignment
        fields = (
            'id',
            'skill',
            'skill_name',
            'category_name',
            'level',
            'status',
            'confirmed_at',
            'created_at',
        )
        read_only_fields = ('status', 'confirmed_at', 'created_at')


class TeamAssignmentSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source='skill.name', read_only=True)
    category_name = serializers.CharField(source='skill.category.name', read_only=True)
    employee_name = serializers.CharField(source='employee.__str__', read_only=True)

    class Meta:
        model = SkillAssignment
        fields = (
            'id',
            'employee',
            'employee_name',
            'skill',
            'skill_name',
            'category_name',
            'level',
            'status',
            'created_at',
        )
        read_only_fields = fields


class MatrixEmployeeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()


class MatrixSkillSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    category_name = serializers.CharField()


class MatrixAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillAssignment
        fields = ('id', 'employee', 'skill', 'level', 'status')


class SkillRequirementSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source='skill.name', read_only=True)
    category_name = serializers.CharField(source='skill.category.name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        model = SkillRequirement
        fields = ('id', 'team', 'team_name', 'skill', 'skill_name', 'category_name', 'required_level')


class SkillAssignmentHistorySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.__str__', read_only=True)
    skill_name = serializers.CharField(source='skill.name', read_only=True)
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SkillAssignmentHistory
        fields = (
            'id', 'employee', 'employee_name', 'skill', 'skill_name',
            'old_level', 'new_level', 'action', 'changed_by', 'changed_by_name',
            'timestamp',
        )

    def get_changed_by_name(self, obj):
        return str(obj.changed_by) if obj.changed_by else None


class RoleTemplateSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source='skill.name', read_only=True)

    class Meta:
        model = RoleTemplateSkill
        fields = ('id', 'skill', 'skill_name', 'required_level')


class RoleTemplateSerializer(serializers.ModelSerializer):
    skills = RoleTemplateSkillSerializer(many=True, read_only=True)

    class Meta:
        model = RoleTemplate
        fields = ('id', 'name', 'description', 'skills')


class RoleTemplateApplySerializer(serializers.Serializer):
    team = serializers.IntegerField()


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
