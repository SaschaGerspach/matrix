from employees.models import Employee
from employees.utils import get_employee
from teams.utils import get_led_member_ids

from ..models import Skill, SkillAssignment


def can_view_employee_data(user, target_employee_id):
    if user.is_staff:
        return True
    employee = get_employee(user)
    if employee is None:
        return False
    if employee.id == target_employee_id:
        return True
    return target_employee_id in get_led_member_ids(employee)


def build_export_data():
    employees = list(Employee.objects.all().order_by('last_name', 'first_name'))
    skills = list(Skill.objects.select_related('category').order_by('category__name', 'name'))

    assignment_map = {}
    for a in SkillAssignment.objects.only('employee_id', 'skill_id', 'level').iterator():
        assignment_map.setdefault(a.employee_id, {})[a.skill_id] = a.level

    return employees, skills, assignment_map
