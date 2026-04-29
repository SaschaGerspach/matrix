from rest_framework.permissions import BasePermission, SAFE_METHODS

from teams.utils import is_team_lead


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_staff


class IsAdminOrTeamLead(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.is_staff or is_team_lead(request.user)
