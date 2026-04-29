from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification
from .tasks import send_notification_email


def _send_ws_notification(notification):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    user_id = notification.recipient.user_id
    if user_id is None:
        return
    async_to_sync(channel_layer.group_send)(
        f'notifications_{user_id}',
        {
            'type': 'send_notification',
            'data': {
                'id': notification.id,
                'type': notification.type,
                'message': notification.message,
                'actor_name': str(notification.actor) if notification.actor else None,
                'created_at': notification.created_at.isoformat(),
            },
        },
    )


def _send_email_notification(notification):
    email = notification.recipient.email
    if not email:
        return
    send_notification_email.delay(email, notification.type, notification.message)


def _dispatch(notification):
    _send_ws_notification(notification)
    _send_email_notification(notification)


def notify_team_leads_pending(employee, skill, level):
    from teams.models import Team

    teams = Team.objects.filter(members=employee)
    leads = set()
    for team in teams:
        for lead in team.team_leads.all():
            if lead != employee:
                leads.add(lead)

    for lead in leads:
        notification = Notification.objects.create(
            recipient=lead,
            actor=employee,
            type=Notification.Type.SKILL_PENDING,
            message=f'{employee} added {skill.name} (level {level}) – pending review',
        )
        _dispatch(notification)


def notify_skill_confirmed(employee, skill, confirmed_by):
    notification = Notification.objects.create(
        recipient=employee,
        actor=confirmed_by,
        type=Notification.Type.SKILL_CONFIRMED,
        message=f'{confirmed_by} confirmed your {skill.name} skill',
    )
    _dispatch(notification)


def notify_skill_updated(employee, skill, old_level, new_level, changed_by):
    if changed_by == employee:
        return
    notification = Notification.objects.create(
        recipient=employee,
        actor=changed_by,
        type=Notification.Type.SKILL_UPDATED,
        message=f'{changed_by} updated your {skill.name} from level {old_level} to {new_level}',
    )
    _dispatch(notification)
