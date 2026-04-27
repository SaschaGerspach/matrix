from rest_framework.permissions import BasePermission, SAFE_METHODS


def get_employee(user):
    try:
        return user.employee
    except user._meta.model.employee.RelatedObjectDoesNotExist:
        return None


def is_team_lead(user):
    employee = get_employee(user)
    if employee is None:
        return False
    return employee.led_teams.exists()


def get_led_member_ids(employee):
    from teams.models import Team
    team_ids = employee.led_teams.values_list('id', flat=True)
    return set(
        Team.objects.filter(id__in=team_ids)
        .values_list('members__id', flat=True)
    )


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_staff
