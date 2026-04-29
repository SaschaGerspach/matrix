import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

SUBJECT_MAP = {
    'skill_pending': 'Skill pending review',
    'skill_confirmed': 'Skill confirmed',
    'skill_updated': 'Skill level updated',
}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_email(self, recipient_email, notification_type, message):
    subject = SUBJECT_MAP.get(notification_type, 'Skill Matrix Notification')
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
    except Exception as exc:
        logger.warning('Failed to send email to %s: %s', recipient_email, exc)
        raise self.retry(exc=exc) from exc
