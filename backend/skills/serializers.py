from rest_framework import serializers

from employees.utils import get_employee
from teams.utils import get_led_member_ids

from .models import (
    RoleTemplate,
    RoleTemplateSkill,
    Skill,
    SkillAssignment,
    SkillAssignmentHistory,
    SkillCategory,
    SkillLevelDescription,
    SkillRequirement,
)


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

    def validate(self, attrs):
        # The database constraint is on Lower(name), which DRF cannot derive a
        # validator from, so without this a clashing name raises IntegrityError
        # and surfaces as a 500 instead of a field error.
        name = attrs.get('name', getattr(self.instance, 'name', None))
        category = attrs.get('category', getattr(self.instance, 'category', None))
        if name and category:
            clashing = Skill.objects.filter(name__iexact=name, category=category)
            if self.instance:
                clashing = clashing.exclude(pk=self.instance.pk)
            if clashing.exists():
                raise serializers.ValidationError({
                    'name': 'A skill with this name already exists in this category.',
                })
        return attrs


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
    team_names = serializers.SerializerMethodField()
    has_team_lead = serializers.SerializerMethodField()

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
            'team_names',
            'has_team_lead',
        )
        read_only_fields = fields

    def get_team_names(self, obj):
        return [team.name for team in obj.employee.teams.all()]

    # Tells an admin whether a lead already owns this, or whether nobody can
    # review it. Reads the prefetch cache rather than querying per row.
    def get_has_team_lead(self, obj):
        return any(team.team_leads.all() for team in obj.employee.teams.all())


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
        if self.instance is not None and self.instance.employee_id != value.id:
            raise serializers.ValidationError('Employee cannot be changed after creation.')
        request = self.context['request']
        if request.user.is_superuser:
            return value
        employee = get_employee(request.user)
        if employee is None:
            raise serializers.ValidationError('Your user is not linked to an employee.')
        if value.id == employee.id:
            return value
        if value.id in get_led_member_ids(employee):
            return value
        raise serializers.ValidationError('You can only assign skills to yourself or your team members.')

    def validate_skill(self, value):
        if self.instance is not None and self.instance.skill_id != value.id:
            raise serializers.ValidationError('Skill cannot be changed after creation.')
        return value
