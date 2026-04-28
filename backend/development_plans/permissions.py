from rest_framework.permissions import BasePermission, SAFE_METHODS

from employees.utils import get_employee
from teams.utils import get_led_member_ids


class DevelopmentPlanPermission(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        return get_employee(request.user) is not None

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        employee = get_employee(request.user)
        if employee is None:
            return False
        if obj.employee_id == employee.id:
            return True
        return obj.employee_id in get_led_member_ids(employee)


class DevelopmentGoalPermission(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        return get_employee(request.user) is not None

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        employee = get_employee(request.user)
        if employee is None:
            return False
        if obj.plan.employee_id == employee.id:
            return True
        return obj.plan.employee_id in get_led_member_ids(employee)
