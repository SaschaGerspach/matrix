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


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_staff
