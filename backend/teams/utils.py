from employees.utils import get_employee

from .models import Team


def is_team_lead(user):
    employee = get_employee(user)
    if employee is None:
        return False
    return employee.led_teams.exists()


def get_led_member_ids(employee):
    team_ids = employee.led_teams.values_list('id', flat=True)
    return set(
        Team.objects.filter(id__in=team_ids)
        .values_list('members__id', flat=True)
    )
