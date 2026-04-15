from django.conf import settings
from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=150)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children',
    )

    def __str__(self):
        return self.name


class Employee(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='employee',
    )

    def __str__(self):
        return f'{self.first_name} {self.last_name}'


class Team(models.Model):
    name = models.CharField(max_length=150)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='teams',
    )
    members = models.ManyToManyField(
        Employee,
        related_name='teams',
        blank=True,
    )
    team_leads = models.ManyToManyField(
        Employee,
        related_name='led_teams',
        blank=True,
    )

    def __str__(self):
        return self.name


class SkillCategory(models.Model):
    name = models.CharField(max_length=150)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children',
    )

    class Meta:
        verbose_name_plural = 'Skill categories'

    def __str__(self):
        return self.name


class Skill(models.Model):
    name = models.CharField(max_length=150)
    category = models.ForeignKey(
        SkillCategory,
        on_delete=models.PROTECT,
        related_name='skills',
    )

    class Meta:
        unique_together = ('name', 'category')

    def __str__(self):
        return self.name


class SkillAssignment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='skill_assignments',
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    level = models.PositiveSmallIntegerField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    confirmed_by = models.ForeignKey(
        Employee,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='confirmations',
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('employee', 'skill')
        constraints = [
            models.CheckConstraint(
                condition=models.Q(level__gte=1) & models.Q(level__lte=5),
                name='skillassignment_level_1_to_5',
            ),
        ]

    def __str__(self):
        return f'{self.employee} – {self.skill} ({self.level})'
