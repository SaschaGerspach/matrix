from django.db import models

from employees.models import Employee
from skills.models import Skill


class DevelopmentPlan(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='development_plans',
    )
    title = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} – {self.employee}'


class DevelopmentGoal(models.Model):
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'

    plan = models.ForeignKey(
        DevelopmentPlan,
        on_delete=models.CASCADE,
        related_name='goals',
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='development_goals',
    )
    current_level = models.PositiveSmallIntegerField()
    target_level = models.PositiveSmallIntegerField()
    target_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )

    class Meta:
        unique_together = ('plan', 'skill')
        ordering = ['skill__name']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(current_level__gte=1) & models.Q(current_level__lte=5),
                name='devgoal_current_level_1_to_5',
            ),
            models.CheckConstraint(
                condition=models.Q(target_level__gte=1) & models.Q(target_level__lte=5),
                name='devgoal_target_level_1_to_5',
            ),
        ]

    def __str__(self):
        return f'{self.skill.name}: {self.current_level} → {self.target_level}'
