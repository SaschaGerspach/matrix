from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        SKILL_PENDING = 'skill_pending', 'Skill pending review'
        SKILL_CONFIRMED = 'skill_confirmed', 'Skill confirmed'
        SKILL_UPDATED = 'skill_updated', 'Skill updated'

    recipient = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    actor = models.ForeignKey(
        'employees.Employee',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    type = models.CharField(max_length=32, choices=Type.choices)
    # English text for e-mail and for notifications stored before params existed;
    # the UI composes its own text from type, actor and params in its language.
    message = models.CharField(max_length=500)
    params = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.recipient} – {self.type}'
