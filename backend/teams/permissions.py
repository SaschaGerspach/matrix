from rest_framework.permissions import SAFE_METHODS, BasePermission

from employees.utils import get_employee


class TeamPermission(BasePermission):
    """Admins manage teams; a lead may only edit the teams they lead.

    Creating and deleting teams stays with admins: a lead editing membership is
    org upkeep, but creating a team they then lead is a different thing.
    """

    LEAD_ACTIONS = ('update', 'partial_update')

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS or request.user.is_superuser:
            return True
        return getattr(view, 'action', None) in self.LEAD_ACTIONS

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS or request.user.is_superuser:
            return True
        employee = get_employee(request.user)
        if employee is None:
            return False
        return obj.team_leads.filter(pk=employee.pk).exists()
