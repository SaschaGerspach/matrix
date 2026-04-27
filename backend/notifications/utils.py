from .models import Notification


def notify_team_leads_pending(employee, skill, level):
    from teams.models import Team

    teams = Team.objects.filter(members=employee)
    leads = set()
    for team in teams:
        for lead in team.team_leads.all():
            if lead != employee:
                leads.add(lead)

    for lead in leads:
        Notification.objects.create(
            recipient=lead,
            actor=employee,
            type=Notification.Type.SKILL_PENDING,
            message=f'{employee} added {skill.name} (level {level}) – pending review',
        )


def notify_skill_confirmed(employee, skill, confirmed_by):
    Notification.objects.create(
        recipient=employee,
        actor=confirmed_by,
        type=Notification.Type.SKILL_CONFIRMED,
        message=f'{confirmed_by} confirmed your {skill.name} skill',
    )


def notify_skill_updated(employee, skill, old_level, new_level, changed_by):
    if changed_by == employee:
        return
    Notification.objects.create(
        recipient=employee,
        actor=changed_by,
        type=Notification.Type.SKILL_UPDATED,
        message=f'{changed_by} updated your {skill.name} from level {old_level} to {new_level}',
    )
