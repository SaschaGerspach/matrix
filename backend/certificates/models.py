from django.core.validators import FileExtensionValidator
from django.db import models

from employees.models import Employee
from skills.models import Skill

MAX_CERTIFICATE_FILE_SIZE = 10 * 1024 * 1024


def certificate_upload_path(instance, filename):
    return f'certificates/{instance.employee_id}/{filename}'


def validate_file_size(file):
    if file.size > MAX_CERTIFICATE_FILE_SIZE:
        from django.core.exceptions import ValidationError
        raise ValidationError('File too large. Maximum 10MB.')


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
    file = models.FileField(
        upload_to=certificate_upload_path,
        blank=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png']),
            validate_file_size,
        ],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} – {self.employee}'
