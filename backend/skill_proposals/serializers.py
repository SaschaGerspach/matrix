from rest_framework import serializers

from .models import SkillProposal


class SkillProposalSerializer(serializers.ModelSerializer):
    proposed_by_name = serializers.CharField(source='proposed_by.__str__', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    reviewed_by_name = serializers.CharField(source='reviewed_by.__str__', read_only=True, default=None)

    class Meta:
        model = SkillProposal
        fields = (
            'id', 'proposed_by', 'proposed_by_name', 'skill_name',
            'category', 'category_name', 'reason', 'status',
            'reviewed_by', 'reviewed_by_name', 'review_note',
            'created_at', 'reviewed_at',
        )
        read_only_fields = ('status', 'reviewed_by', 'review_note', 'reviewed_at', 'created_at')
