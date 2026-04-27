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


class Team(models.Model):
    name = models.CharField(max_length=150)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='teams',
    )
    members = models.ManyToManyField(
        'employees.Employee',
        related_name='teams',
        blank=True,
    )
    team_leads = models.ManyToManyField(
        'employees.Employee',
        related_name='led_teams',
        blank=True,
    )

    def __str__(self):
        return self.name
