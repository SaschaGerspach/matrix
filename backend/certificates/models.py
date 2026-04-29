from django.core.validators import FileExtensionValidator
from django.db import models

from employees.models import Employee
from skills.models import Skill

MAX_CERTIFICATE_FILE_SIZE = 10 * 1024 * 1024


def certificate_upload_path(instance, filename):
    from pathlib import Path
    from uuid import uuid4
    ext = Path(filename).suffix
    return f'certificates/{instance.employee_id}/{uuid4().hex}{ext}'


ALLOWED_MIME_SIGNATURES = {
    b'%PDF': 'application/pdf',
    b'\xff\xd8\xff': 'image/jpeg',
    b'\x89PNG\r\n\x1a\n': 'image/png',
}


def validate_file_size(file):
    if file.size > MAX_CERTIFICATE_FILE_SIZE:
        from django.core.exceptions import ValidationError
        raise ValidationError('File too large. Maximum 10MB.')


def validate_file_content(file):
    from django.core.exceptions import ValidationError
    header = file.read(8)
    file.seek(0)
    for signature in ALLOWED_MIME_SIGNATURES:
        if header.startswith(signature):
            return
    raise ValidationError('Invalid file content. Only PDF, JPEG, and PNG files are allowed.')


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
            validate_file_content,
        ],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} – {self.employee}'
