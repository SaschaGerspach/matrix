from rest_framework.permissions import BasePermission, SAFE_METHODS

from employees.utils import get_employee
from teams.utils import is_team_lead


class SkillProposalPermission(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        if is_team_lead(request.user):
            return True
        employee = get_employee(request.user)
        if employee is None:
            return False
        return obj.proposed_by_id == employee.id
