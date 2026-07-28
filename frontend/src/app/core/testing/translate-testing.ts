import { NgModule } from '@angular/core';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

const EN = {
  APP_NAME: 'Skill Matrix',
  NAV: {
    MY_SKILLS: 'My Skills', TEAM_REVIEW: 'Team Review', SKILL_GAPS: 'Skill Gaps',
    TEAM_COMPARISON: 'Team Comparison', DASHBOARD: 'Dashboard', KPIS: 'KPIs',
    EMPLOYEES: 'Employees', ADMIN: 'Admin', SIGN_OUT: 'Sign out',
    SETTINGS: 'Settings', TOGGLE_DARK_MODE: 'Toggle dark mode',
    PROPOSALS: 'Proposals', MENU: 'Open navigation',
    GROUP_PERSONAL: 'Personal', GROUP_TEAM: 'Team', GROUP_ANALYSIS: 'Analysis',
    GROUP_ORGANISATION: 'Organisation', GROUP_ADMINISTRATION: 'Administration',
  },
  NOTIFICATIONS: { TITLE: 'Notifications', MARK_ALL_READ: 'Mark all read', EMPTY: 'No notifications' },
  PROPOSALS: {
    TITLE: 'Skill Proposals', PROPOSE: 'Propose Skill', SKILL_NAME: 'Skill name',
    REASON: 'Reason', PROPOSED_BY: 'Proposed by', SUBMIT: 'Submit', ALL: 'All',
    PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected',
    EMPTY: 'No proposals yet.', SUBTITLE: '{{count}} proposals',
    APPROVE: 'Approve', REJECT: 'Reject',
    CATEGORY_HINT: 'Required — a proposal without a category cannot be approved',
    ALREADY_IN_CATEGORY: 'Already in this category ({{count}})',
    CATEGORY_EMPTY: 'This category has no skills yet.',
    NAME_TAKEN: 'This skill already exists in the selected category',
    OUTCOME_CREATES: 'Adds this skill to the catalogue',
    OUTCOME_EXISTS: 'Already in the catalogue — approving changes nothing',
    OUTCOME_NO_CATEGORY: 'No category — cannot be approved',
  },
  LOGIN: { TITLE: 'Sign in', USERNAME: 'Username', PASSWORD: 'Password', SUBMIT: 'Sign in' },
  MY_SKILLS: {
    TITLE: 'My Skills', ADD_SKILL: 'Add Skill',
    EMPTY: 'No skills assigned yet. Click "Add Skill" to get started.',
    EMPTY_TITLE: 'No skills yet', SUBTITLE: '{{count}} skills assessed',
    GAP_SUMMARY: 'Level {{current}} → {{required}} required (gap: {{gap}})',
    RECOMMENDATIONS: 'Recommendations',
  },
  ADD_SKILL_DIALOG: { TITLE: 'Add Skill', SKILL: 'Skill', LEVEL: 'Level (1-5)', CANCEL: 'Cancel', ADD: 'Add' },
  TEAM_REVIEW: {
    TITLE: 'Team Review', EMPTY: 'No pending assignments to review.', CONFIRM: 'Confirm',
    EMPTY_HINT: 'New self-assessments from your team will show up here for confirmation.',
    SUBTITLE: '{{count}} assignments awaiting confirmation',
    ADMIN_FALLBACK: 'You are seeing every open assessment because you are an admin.',
    NO_LEAD_WARNING: '{{count}} of these belong to a team with no lead.',
    NO_LEAD: 'no lead', NO_TEAM: 'no team',
  },
  SKILL_GAPS: {
    TITLE: 'Skill Gaps', EMPTY: 'No skill gaps found.',
    EMPTY_HINT: 'Every team member meets the required level for their role.',
    SUBTITLE: '{{count}} gaps against role requirements',
  },
  EMPLOYEES: {
    TITLE: 'Employees', SEARCH: 'Search', SEARCH_PLACEHOLDER: 'Name or email...',
    SUBTITLE: '{{count}} people', EMPTY: 'No employees match your search.',
    EMPTY_HINT: 'Try a different name or email fragment.',
  },
  TEAM_COMPARISON: {
    TITLE: 'Team Comparison', SELECT_TEAMS: 'Select teams', COMPARE: 'Compare',
    SUBTITLE: 'Compare average skill levels across teams',
    EMPTY_TITLE: 'Nothing to compare yet',
    EMPTY_HINT: 'Pick at least two teams and select Compare.',
  },
  EMPLOYEE_PROFILE: {
    BACK: 'Back', SKILL_OVERVIEW: 'Skill Overview', SKILLS: 'Skills',
    SKILL_TRENDS: 'Skill Trends', HISTORY: 'History',
    EMPTY_SKILLS: 'No skills assigned yet.', NOT_FOUND: 'Employee not found.',
  },
  DASHBOARD: {
    TITLE: 'Skill Matrix', EXPORT_CSV: 'Export CSV', EXPORT_PDF: 'Export PDF',
    SEARCH: 'Search', SEARCH_PLACEHOLDER: 'Employee name...', TEAM: 'Team', CATEGORY: 'Category',
    CLEAR: 'Clear', EMPTY: 'No employees found.',
    SUBTITLE: '{{employees}} people across {{skills}} skills',
    EMPTY_HINT: 'Try widening the team or category filter, or clear the search term.',
    LEGEND: 'Level', NOT_ASSESSED: 'Not assessed',
    CELL_LABEL: '{{employee}}, {{skill}}: level {{level}} of 5',
    CELL_LABEL_EMPTY: '{{employee}}, {{skill}}: not assessed',
  },
  KPI: {
    TITLE: 'Team KPIs', EMPTY: 'No team data available.',
    EMPTY_HINT: 'KPIs appear once teams have skill assignments recorded.',
    SUBTITLE: '{{count}} teams',
    AVG_LEVEL: 'Avg. Level', COVERAGE: 'Skill Coverage', CONFIRMED: 'Confirmed',
    TOTAL_ASSIGNMENTS: 'Total Assignments', PENDING: 'Awaiting confirmation',
    SHOW_DETAILS: 'Show details', HIDE_DETAILS: 'Hide details',
    REQUIRED_SKILLS: 'Required skills', MET_BY: '{{met}} of {{total}}',
    NO_REQUIREMENTS: 'No skill requirements defined for this team yet.',
    MEMBERS: 'Members', NO_MEMBERS: 'This team has no members yet.',
  },
  ADMIN: {
    TITLE: 'Admin', TAB_CATEGORIES: 'Categories', TAB_SKILLS: 'Skills',
    TAB_REQUIREMENTS: 'Requirements', TAB_ROLE_TEMPLATES: 'Role Templates',
    TAB_LEVEL_DEFS: 'Level Definitions', CATEGORY_NAME: 'Category name',
    SKILL_NAME: 'Skill name', CATEGORY: 'Category', TEAM: 'Team', SKILL: 'Skill',
    REQUIRED_LEVEL: 'Required level', LEVEL: 'Level', DESCRIPTION: 'Description',
    ADD: 'Add', TEMPLATE_NAME: 'Template name', CREATE_TEMPLATE: 'Create Template',
    MANAGE_SKILLS: 'Manage Template Skills', APPLY_TO_TEAM: 'Apply Template to Team',
    TEMPLATE: 'Template', ADD_SKILL: 'Add Skill', ADD_REQUIREMENT: 'Add Requirement', APPLY: 'Apply', SKILLS_COUNT: 'Skills',
    TAB_IMPORT: 'Import', IMPORT_EMPLOYEES: 'Import Employees', IMPORT_SKILLS: 'Import Skills',
    IMPORT_EMPLOYEES_HINT: 'CSV with columns: first_name, last_name, email',
    IMPORT_SKILLS_HINT: 'CSV with columns: name, category',
    CHOOSE_FILE: 'Choose CSV file', IMPORT_CREATED: 'Created',
    IMPORT_SKIPPED: 'Skipped', IMPORT_ERRORS: 'Errors',
    TAB_AUDIT_LOG: 'Audit Log', AUDIT_EMPTY: 'No audit entries yet.',
    AUDIT_USER: 'User', AUDIT_ENTITY: 'Entity', AUDIT_DETAIL: 'Detail',
    TOTAL_SKILLS: 'Total skills', CATEGORIES_COUNT: 'Categories', UNASSIGNED: 'Unassigned',
    SEARCH_SKILLS: 'Search skills...', ALL_CATEGORIES: 'All categories', ALL: 'All',
    TEAM_COVERAGE: 'Team coverage', CREATE: 'Create',
    TAB_TEAMS: 'Teams', TEAM_LEADS: 'Leads', ADD_LEAD: 'Add a lead',
    REMOVE_LEAD: 'Remove lead', NO_LEAD_YET: 'none assigned', NO_TEAMS: 'No teams yet.',
    TEAM_HAS_NO_MEMBERS: 'This team has no members yet, so there is nobody to lead it.',
    TEAMS_WITHOUT_LEAD: 'Some teams have no lead',
    TEAMS_WITHOUT_LEAD_HINT: 'Members of {{teams}} can have their self-assessments confirmed by an admin only.',
  },
  TABLE: {
    NAME: 'Name', EMPLOYEE: 'Employee', SKILL: 'Skill', CATEGORY: 'Category',
    LEVEL: 'Level', STATUS: 'Status', REQUIRED: 'Required', ACTUAL: 'Actual', GAP: 'Gap',
    TEAM: 'Team', REQUIRED_LEVEL: 'Required Level', FIRST_NAME: 'First name',
    LAST_NAME: 'Last name', EMAIL: 'Email', DATE: 'Date', ACTION: 'Action',
    FROM: 'From', TO: 'To', CHANGED_BY: 'Changed by', DESCRIPTION: 'Description',
  },
  SETTINGS: {
    TITLE: 'Settings', CHANGE_PASSWORD: 'Change Password',
    CURRENT_PASSWORD: 'Current password', NEW_PASSWORD: 'New password',
    CONFIRM_PASSWORD: 'Confirm new password', SAVE_PASSWORD: 'Save',
    WRONG_PASSWORD: 'Current password is incorrect.',
    PASSWORDS_MISMATCH: 'Passwords do not match.', LANGUAGE: 'Language',
    SUBTITLE: 'Manage your account and interface preferences',
  },
  TOAST: {
    SKILL_CONFIRMED: 'Skill confirmed.', SKILL_ADDED: 'Skill added.',
    CATEGORY_CREATED: 'Category created.', CATEGORY_DELETED: 'Category deleted.',
    SKILL_CREATED: 'Skill created.', SKILL_UPDATED: 'Skill updated.', SKILL_DELETED: 'Skill deleted.',
    SKILL_DUPLICATE: 'A skill with this name already exists in this category.',
    REQUIREMENT_CREATED: 'Requirement created.', REQUIREMENT_DELETED: 'Requirement deleted.',
    LEVEL_DESC_CREATED: 'Level description created.', LEVEL_DESC_DELETED: 'Level description deleted.',
    TEMPLATE_CREATED: 'Role template created.', TEMPLATE_DELETED: 'Role template deleted.',
    TEMPLATE_APPLIED: 'Template applied to team.', IMPORT_COMPLETE: 'Import complete.',
    PASSWORD_CHANGED: 'Password changed.', PROPOSAL_SUBMITTED: 'Proposal submitted.',
    PROPOSAL_APPROVED: 'Proposal approved.', PROPOSAL_REJECTED: 'Proposal rejected.',
    ERROR: 'An error occurred. Please try again.',
  },
  COMMON: { MEMBERS: 'members' },
};

class InlineLoader implements TranslateLoader {
  getTranslation() {
    return of(EN);
  }
}

@NgModule({
  imports: [
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: { provide: TranslateLoader, useClass: InlineLoader },
    }),
  ],
  exports: [TranslateModule],
})
export class TranslateTestingModule {
  constructor(translate: TranslateService) {
    translate.use('en');
  }
}
