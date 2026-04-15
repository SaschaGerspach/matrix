import pytest
from django.db import IntegrityError, transaction

from core.models import (
    Department,
    Employee,
    Skill,
    SkillAssignment,
    SkillCategory,
    Team,
)


pytestmark = pytest.mark.django_db


def test_department_hierarchy():
    root = Department.objects.create(name='Engineering')
    child = Department.objects.create(name='Backend', parent=root)
    assert child.parent == root
    assert list(root.children.all()) == [child]


def test_department_cascade_deletes_children():
    root = Department.objects.create(name='Engineering')
    Department.objects.create(name='Backend', parent=root)
    root.delete()
    assert Department.objects.count() == 0


def test_employee_email_must_be_unique():
    Employee.objects.create(first_name='Ada', last_name='Lovelace', email='ada@example.com')
    with pytest.raises(IntegrityError):
        Employee.objects.create(first_name='Ada2', last_name='L', email='ada@example.com')


def test_team_members_and_leads_are_independent():
    dept = Department.objects.create(name='Eng')
    team = Team.objects.create(name='Core', department=dept)
    alice = Employee.objects.create(first_name='Alice', last_name='A', email='a@x.com')
    bob = Employee.objects.create(first_name='Bob', last_name='B', email='b@x.com')
    team.members.add(alice, bob)
    team.team_leads.add(bob)
    assert set(team.members.all()) == {alice, bob}
    assert list(team.team_leads.all()) == [bob]
    assert list(bob.led_teams.all()) == [team]


def test_employee_can_belong_to_multiple_teams():
    dept = Department.objects.create(name='Eng')
    t1 = Team.objects.create(name='A', department=dept)
    t2 = Team.objects.create(name='B', department=dept)
    emp = Employee.objects.create(first_name='X', last_name='Y', email='x@x.com')
    t1.members.add(emp)
    t2.members.add(emp)
    assert set(emp.teams.all()) == {t1, t2}


def test_skill_unique_per_category():
    cat = SkillCategory.objects.create(name='Programming')
    Skill.objects.create(name='Python', category=cat)
    with pytest.raises(IntegrityError):
        Skill.objects.create(name='Python', category=cat)


def test_same_skill_name_allowed_in_different_categories():
    cat_a = SkillCategory.objects.create(name='Programming')
    cat_b = SkillCategory.objects.create(name='Tools')
    Skill.objects.create(name='Git', category=cat_a)
    Skill.objects.create(name='Git', category=cat_b)
    assert Skill.objects.count() == 2


def _make_assignment(level=3):
    cat = SkillCategory.objects.create(name='Programming')
    skill = Skill.objects.create(name='Python', category=cat)
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    return SkillAssignment.objects.create(employee=emp, skill=skill, level=level)


def test_skill_assignment_default_status_pending():
    sa = _make_assignment()
    assert sa.status == SkillAssignment.Status.PENDING


@pytest.mark.parametrize('level', [0, 6, 10])
def test_skill_assignment_level_out_of_range_rejected(level):
    cat = SkillCategory.objects.create(name='X')
    skill = Skill.objects.create(name='S', category=cat)
    emp = Employee.objects.create(first_name='A', last_name='B', email='a@b.com')
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            SkillAssignment.objects.create(employee=emp, skill=skill, level=level)


@pytest.mark.parametrize('level', [1, 3, 5])
def test_skill_assignment_level_in_range_accepted(level):
    cat = SkillCategory.objects.create(name='X')
    skill = Skill.objects.create(name=f'S{level}', category=cat)
    emp = Employee.objects.create(first_name='A', last_name='B', email=f'a{level}@b.com')
    sa = SkillAssignment.objects.create(employee=emp, skill=skill, level=level)
    assert sa.level == level


def test_skill_assignment_unique_per_employee_and_skill():
    sa = _make_assignment()
    with pytest.raises(IntegrityError):
        SkillAssignment.objects.create(employee=sa.employee, skill=sa.skill, level=4)
