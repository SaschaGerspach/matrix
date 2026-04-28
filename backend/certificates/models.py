from django.db import models

from employees.models import Employee
from skills.models import Skill


def certificate_upload_path(instance, filename):
    return f'certificates/{instance.employee_id}/{filename}'


class Certificate(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='certificates',
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='certificates',
    )
    name = models.CharField(max_length=200)
    issuer = models.CharField(max_length=200, blank=True)
    issued_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    file = models.FileField(upload_to=certificate_upload_path, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} – {self.employee}'
