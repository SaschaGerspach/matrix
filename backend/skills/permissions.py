from rest_framework.permissions import BasePermission, SAFE_METHODS

from employees.utils import get_employee
from teams.utils import get_led_member_ids, is_team_lead


class SkillAssignmentPermission(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        if request.method == 'DELETE':
            return False
        employee = get_employee(request.user)
        return employee is not None

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        if request.method == 'DELETE':
            return False
        employee = get_employee(request.user)
        if employee is None:
            return False
        if obj.employee_id == employee.id:
            return True
        if obj.employee_id in get_led_member_ids(employee):
            return True
        return False


class CanConfirmSkillAssignment(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_staff:
            return True
        return is_team_lead(request.user)

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        employee = get_employee(request.user)
        if employee is None:
            return False
        return obj.employee_id in get_led_member_ids(employee)
