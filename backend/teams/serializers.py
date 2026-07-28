from rest_framework import serializers

from .models import Department, Team


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ('id', 'name', 'parent')


class TeamPersonSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(source='__str__', read_only=True)


class TeamSerializer(serializers.ModelSerializer):
    # Names alongside the writable id lists, so managing leads does not need a
    # second, paginated pass over the employee list.
    member_details = TeamPersonSerializer(source='members', many=True, read_only=True)
    lead_details = TeamPersonSerializer(source='team_leads', many=True, read_only=True)

    class Meta:
        model = Team
        fields = (
            'id', 'name', 'department', 'members', 'team_leads',
            'member_details', 'lead_details',
        )

    # A lead may adjust who is in their team, nothing else. Without this the
    # object permission alone would still let them add themselves as lead
    # elsewhere or rename the team.
    LEAD_EDITABLE_FIELDS = {'members'}

    def validate(self, attrs):
        request = self.context.get('request')
        if request is None or request.user.is_superuser:
            return attrs
        forbidden = sorted(set(attrs) - self.LEAD_EDITABLE_FIELDS)
        if forbidden:
            raise serializers.ValidationError({
                field: 'Only an admin can change this.' for field in forbidden
            })
        return attrs
