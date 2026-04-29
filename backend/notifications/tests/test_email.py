import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from unittest.mock import patch, MagicMock, AsyncMock

from employees.models import Employee
from notifications.tasks import send_notification_email
from notifications.utils import notify_skill_confirmed, notify_skill_updated, notify_team_leads_pending
from skills.models import Skill, SkillCategory
from teams.models import Department, Team

pytestmark = pytest.mark.django_db


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username='emailuser', password='pw12345!')


@pytest.fixture
def employee(user):
    return Employee.objects.create(first_name='Email', last_name='User', email='email@test.com', user=user)


@pytest.fixture
def lead_user(db):
    return get_user_model().objects.create_user(username='leaduser', password='pw12345!')


@pytest.fixture
def lead(lead_user):
    return Employee.objects.create(first_name='Team', last_name='Lead', email='lead@test.com', user=lead_user)


@pytest.fixture
def skill(db):
    cat = SkillCategory.objects.create(name='TestCat')
    return Skill.objects.create(name='Python', category=cat)


@pytest.fixture
def team(lead, employee):
    dept = Department.objects.create(name='TestDept')
    team = Team.objects.create(name='TestTeam', department=dept)
    team.members.add(employee)
    team.team_leads.add(lead)
    return team


def test_send_notification_email_task():
    mail.outbox.clear()
    send_notification_email('test@example.com', 'skill_confirmed', 'Your Python skill was confirmed')

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ['test@example.com']
    assert mail.outbox[0].subject == 'Skill confirmed'
    assert 'Python' in mail.outbox[0].body


def test_send_notification_email_unknown_type():
    mail.outbox.clear()
    send_notification_email('test@example.com', 'unknown_type', 'Some message')

    assert len(mail.outbox) == 1
    assert mail.outbox[0].subject == 'Skill Matrix Notification'


@patch('notifications.utils.get_channel_layer', return_value=None)
def test_skill_confirmed_sends_email(mock_cl, employee, lead, skill):
    mail.outbox.clear()
    notify_skill_confirmed(employee, skill, lead)

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ['email@test.com']
    assert 'confirmed' in mail.outbox[0].subject.lower()


@patch('notifications.utils.get_channel_layer', return_value=None)
def test_skill_updated_sends_email(mock_cl, employee, lead, skill):
    mail.outbox.clear()
    notify_skill_updated(employee, skill, 2, 4, lead)

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ['email@test.com']
    assert 'updated' in mail.outbox[0].body.lower()


@patch('notifications.utils.get_channel_layer', return_value=None)
def test_skill_updated_self_no_email(mock_cl, employee, skill):
    mail.outbox.clear()
    notify_skill_updated(employee, skill, 2, 4, employee)

    assert len(mail.outbox) == 0


@patch('notifications.utils.get_channel_layer', return_value=None)
def test_team_leads_pending_sends_email(mock_cl, employee, lead, skill, team):
    mail.outbox.clear()
    notify_team_leads_pending(employee, skill, 3)

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ['lead@test.com']
    assert 'pending' in mail.outbox[0].subject.lower()


def test_no_email_sent_if_no_email_address():
    mail.outbox.clear()
    emp = Employee.objects.create(first_name='No', last_name='Email', email='')

    mock_layer = MagicMock()
    mock_layer.group_send = AsyncMock()

    with patch('notifications.utils.get_channel_layer', return_value=None):
        from notifications.models import Notification
        from notifications.utils import _send_email_notification
        notification = Notification.objects.create(
            recipient=emp,
            type=Notification.Type.SKILL_CONFIRMED,
            message='Test',
        )
        _send_email_notification(notification)

    assert len(mail.outbox) == 0
