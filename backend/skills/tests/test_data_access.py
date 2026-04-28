import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from employees.models import Employee
from skills.models import Skill, SkillAssignment, SkillAssignmentHistory, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def setup(db):
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)
    cat = SkillCategory.objects.create(name='Programming')
    skill = Skill.objects.create(name='Python', category=cat)

    alice_user = User.objects.create_user(username='alice', password='pw!')
    alice = Employee.objects.create(first_name='Alice', last_name='A', email='alice@x.com', user=alice_user)
    team.members.add(alice)

    bob_user = User.objects.create_user(username='bob', password='pw!')
    bob = Employee.objects.create(first_name='Bob', last_name='B', email='bob@x.com', user=bob_user)

    lead_user = User.objects.create_user(username='lead', password='pw!')
    lead = Employee.objects.create(first_name='Lead', last_name='L', email='lead@x.com', user=lead_user)
    team.team_leads.add(lead)
    team.members.add(lead)

    admin_user = User.objects.create_user(username='admin', password='pw!', is_staff=True)
    Employee.objects.create(first_name='Admin', last_name='A', email='admin@x.com', user=admin_user)

    SkillAssignmentHistory.objects.create(
        employee=alice, skill=skill,
        old_level=None, new_level=3, action='created', changed_by=alice,
    )
    SkillAssignmentHistory.objects.create(
        employee=bob, skill=skill,
        old_level=None, new_level=2, action='created', changed_by=bob,
    )

    return {
        'alice_user': alice_user, 'alice': alice,
        'bob_user': bob_user, 'bob': bob,
        'lead_user': lead_user, 'lead': lead,
        'admin_user': admin_user,
        'skill': skill,
    }


class TestSkillTrendsAuthorization:
    def test_user_can_view_own_trends(self, setup):
        c = APIClient()
        c.force_authenticate(user=setup['alice_user'])
        r = c.get(f'/api/skill-trends/?employee={setup["alice"].id}')
        assert r.status_code == status.HTTP_200_OK
        assert len(r.data) == 1

    def test_user_cannot_view_other_trends(self, setup):
        c = APIClient()
        c.force_authenticate(user=setup['alice_user'])
        r = c.get(f'/api/skill-trends/?employee={setup["bob"].id}')
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_team_lead_can_view_member_trends(self, setup):
        c = APIClient()
        c.force_authenticate(user=setup['lead_user'])
        r = c.get(f'/api/skill-trends/?employee={setup["alice"].id}')
        assert r.status_code == status.HTTP_200_OK

    def test_team_lead_cannot_view_non_member_trends(self, setup):
        c = APIClient()
        c.force_authenticate(user=setup['lead_user'])
        r = c.get(f'/api/skill-trends/?employee={setup["bob"].id}')
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_view_any_trends(self, setup):
        c = APIClient()
        c.force_authenticate(user=setup['admin_user'])
        r = c.get(f'/api/skill-trends/?employee={setup["bob"].id}')
        assert r.status_code == status.HTTP_200_OK


class TestSkillHistoryAuthorization:
    def test_user_sees_only_own_history(self, setup):
        c = APIClient()
        c.force_authenticate(user=setup['alice_user'])
        r = c.get('/api/skill-history/')
        assert r.status_code == status.HTTP_200_OK
        for entry in r.data['results']:
            assert entry['employee'] == setup['alice'].id

    def test_user_cannot_filter_other_employee(self, setup):
        c = APIClient()
        c.force_authenticate(user=setup['alice_user'])
        r = c.get(f'/api/skill-history/?employee={setup["bob"].id}')
        assert r.status_code == status.HTTP_200_OK
        assert r.data['count'] == 0

    def test_team_lead_sees_member_history(self, setup):
        c = APIClient()
        c.force_authenticate(user=setup['lead_user'])
        r = c.get(f'/api/skill-history/?employee={setup["alice"].id}')
        assert r.status_code == status.HTTP_200_OK
        assert r.data['count'] == 1

    def test_admin_sees_all_history(self, setup):
        c = APIClient()
        c.force_authenticate(user=setup['admin_user'])
        r = c.get('/api/skill-history/')
        assert r.status_code == status.HTTP_200_OK
        assert r.data['count'] == 2


class TestAssignmentImmutability:
    def test_cannot_change_employee_on_update(self, setup):
        assignment = SkillAssignment.objects.create(
            employee=setup['alice'], skill=setup['skill'], level=3,
        )
        c = APIClient()
        c.force_authenticate(user=setup['admin_user'])
        r = c.patch(f'/api/skill-assignments/{assignment.id}/', {
            'employee': setup['bob'].id,
        })
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_change_skill_on_update(self, setup):
        cat = SkillCategory.objects.create(name='Other')
        other_skill = Skill.objects.create(name='Go', category=cat)
        assignment = SkillAssignment.objects.create(
            employee=setup['alice'], skill=setup['skill'], level=3,
        )
        c = APIClient()
        c.force_authenticate(user=setup['admin_user'])
        r = c.patch(f'/api/skill-assignments/{assignment.id}/', {
            'skill': other_skill.id,
        })
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_can_change_level_on_update(self, setup):
        assignment = SkillAssignment.objects.create(
            employee=setup['alice'], skill=setup['skill'], level=3,
        )
        c = APIClient()
        c.force_authenticate(user=setup['admin_user'])
        r = c.patch(f'/api/skill-assignments/{assignment.id}/', {'level': 5})
        assert r.status_code == status.HTTP_200_OK
        assignment.refresh_from_db()
        assert assignment.level == 5
