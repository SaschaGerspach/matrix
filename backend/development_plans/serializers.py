from rest_framework import serializers

from .models import DevelopmentGoal, DevelopmentPlan


class DevelopmentGoalSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source='skill.name', read_only=True)
    category_name = serializers.CharField(source='skill.category.name', read_only=True)

    class Meta:
        model = DevelopmentGoal
        fields = (
            'id', 'plan', 'skill', 'skill_name', 'category_name',
            'current_level', 'target_level', 'target_date', 'status',
        )

    def validate(self, attrs):
        current = attrs.get('current_level', getattr(self.instance, 'current_level', 0))
        target = attrs.get('target_level', getattr(self.instance, 'target_level', 0))
        if target <= current:
            raise serializers.ValidationError({'target_level': 'Target level must be higher than current level.'})
        if not 1 <= current <= 5 or not 1 <= target <= 5:
            raise serializers.ValidationError('Levels must be between 1 and 5.')
        return attrs


class DevelopmentPlanSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.__str__', read_only=True)
    goals = DevelopmentGoalSerializer(many=True, read_only=True)

    class Meta:
        model = DevelopmentPlan
        fields = (
            'id', 'employee', 'employee_name', 'title', 'notes',
            'goals', 'created_at', 'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')
