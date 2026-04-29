from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'create'
        UPDATE = 'update'
        DELETE = 'delete'
        APPLY = 'apply'
        IMPORT = 'import'
        LOGIN = 'login'
        LOGIN_FAILED = 'login_failed'
        LOCKOUT = 'lockout'
        LOGOUT = 'logout'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    action = models.CharField(max_length=16, choices=Action.choices)
    entity_type = models.CharField(max_length=64)
    entity_id = models.PositiveIntegerField(null=True, blank=True)
    detail = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.action} {self.entity_type} ({self.entity_id}) by {self.user}'
