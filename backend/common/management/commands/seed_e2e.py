from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillCategory
from teams.models import Department, Team


class Command(BaseCommand):
    help = 'Seed database with E2E test data'

    def handle(self, *args, **options):
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_staff': True, 'is_superuser': True},
        )
        admin_user.set_password('admin123')
        admin_user.save()

        admin_emp, _ = Employee.objects.get_or_create(
            user=admin_user,
            defaults={
                'first_name': 'Alice',
                'last_name': 'Admin',
                'email': 'alice@example.com',
            },
        )

        dev_user, _ = User.objects.get_or_create(
            username='dev',
            defaults={'is_staff': False},
        )
        dev_user.set_password('dev12345')
        dev_user.save()

        dev_emp, _ = Employee.objects.get_or_create(
            user=dev_user,
            defaults={
                'first_name': 'Bob',
                'last_name': 'Developer',
                'email': 'bob@example.com',
            },
        )

        dept, _ = Department.objects.get_or_create(name='Engineering')
        team, _ = Team.objects.get_or_create(name='Backend', defaults={'department': dept})
        team.members.add(admin_emp, dev_emp)
        team.team_leads.add(admin_emp)

        programming, _ = SkillCategory.objects.get_or_create(name='Programming')
        devops, _ = SkillCategory.objects.get_or_create(name='DevOps')

        python, _ = Skill.objects.get_or_create(name='Python', defaults={'category': programming})
        django, _ = Skill.objects.get_or_create(name='Django', defaults={'category': programming})
        docker, _ = Skill.objects.get_or_create(name='Docker', defaults={'category': devops})
        k8s, _ = Skill.objects.get_or_create(name='Kubernetes', defaults={'category': devops})

        for emp, assignments in [
            (admin_emp, [(python, 4, 'confirmed'), (django, 5, 'confirmed'), (docker, 3, 'pending')]),
            (dev_emp, [(python, 3, 'confirmed'), (k8s, 2, 'pending')]),
        ]:
            for skill, level, skill_status in assignments:
                SkillAssignment.objects.get_or_create(
                    employee=emp,
                    skill=skill,
                    defaults={'level': level, 'status': skill_status},
                )

        self.stdout.write(self.style.SUCCESS('E2E seed data created'))
