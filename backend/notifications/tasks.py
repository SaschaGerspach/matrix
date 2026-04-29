from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


SUBJECT_MAP = {
    'skill_pending': 'Skill pending review',
    'skill_confirmed': 'Skill confirmed',
    'skill_updated': 'Skill level updated',
}


@shared_task
def send_notification_email(recipient_email, notification_type, message):
    subject = SUBJECT_MAP.get(notification_type, 'Skill Matrix Notification')
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient_email],
        fail_silently=True,
    )
