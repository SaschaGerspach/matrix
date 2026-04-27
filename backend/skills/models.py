from django.db import models


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


class SkillLevelDescription(models.Model):
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='level_descriptions',
    )
    level = models.PositiveSmallIntegerField()
    description = models.TextField()

    class Meta:
        unique_together = ('skill', 'level')
        ordering = ['skill', 'level']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(level__gte=1) & models.Q(level__lte=5),
                name='skillleveldesc_level_1_to_5',
            ),
        ]

    def __str__(self):
        return f'{self.skill} – Level {self.level}'


class SkillAssignment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'

    employee = models.ForeignKey(
        'employees.Employee',
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
        'employees.Employee',
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


class SkillRequirement(models.Model):
    team = models.ForeignKey(
        'teams.Team',
        on_delete=models.CASCADE,
        related_name='skill_requirements',
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='requirements',
    )
    required_level = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = ('team', 'skill')
        constraints = [
            models.CheckConstraint(
                condition=models.Q(required_level__gte=1) & models.Q(required_level__lte=5),
                name='skillrequirement_level_1_to_5',
            ),
        ]

    def __str__(self):
        return f'{self.team} – {self.skill} (required: {self.required_level})'


class RoleTemplate(models.Model):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class RoleTemplateSkill(models.Model):
    template = models.ForeignKey(
        RoleTemplate,
        on_delete=models.CASCADE,
        related_name='skills',
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='role_template_skills',
    )
    required_level = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = ('template', 'skill')
        constraints = [
            models.CheckConstraint(
                condition=models.Q(required_level__gte=1) & models.Q(required_level__lte=5),
                name='roletemplateskill_level_1_to_5',
            ),
        ]

    def __str__(self):
        return f'{self.template} – {self.skill} ({self.required_level})'


class SkillAssignmentHistory(models.Model):
    class Action(models.TextChoices):
        CREATED = 'created', 'Created'
        UPDATED = 'updated', 'Updated'
        CONFIRMED = 'confirmed', 'Confirmed'
        DELETED = 'deleted', 'Deleted'

    assignment = models.ForeignKey(
        SkillAssignment,
        null=True,
        on_delete=models.SET_NULL,
        related_name='history',
    )
    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='skill_history',
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='history',
    )
    old_level = models.PositiveSmallIntegerField(null=True, blank=True)
    new_level = models.PositiveSmallIntegerField(null=True, blank=True)
    action = models.CharField(max_length=16, choices=Action.choices)
    changed_by = models.ForeignKey(
        'employees.Employee',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.employee} – {self.skill} ({self.action})'
