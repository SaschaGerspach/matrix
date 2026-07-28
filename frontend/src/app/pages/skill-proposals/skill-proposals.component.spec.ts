import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { SkillProposal } from '../../core/skill-proposal.service';
import { SkillProposalsComponent } from './skill-proposals.component';

const meProfile = {
  id: 1, first_name: 'A', last_name: 'B', full_name: 'A B',
  email: 'a@b.com', user: 1, is_team_lead: true, is_admin: false,
};

function proposal(overrides: Partial<SkillProposal> = {}): SkillProposal {
  return {
    id: 1, proposed_by: 5, proposed_by_name: 'Anna Hoffmann',
    skill_name: 'Terraform', category: 3, category_name: 'DevOps',
    reason: 'IaC', status: 'pending', reviewed_by: null, reviewed_by_name: null,
    review_note: '', created_at: '2026-07-01T10:00:00Z', reviewed_at: null,
    ...overrides,
  };
}

describe('SkillProposalsComponent', () => {
  let fixture: ComponentFixture<SkillProposalsComponent>;
  let component: SkillProposalsComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillProposalsComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillProposalsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushInit(proposals: SkillProposal[], skills: unknown[] = []): void {
    http.expectOne((r) => r.url === `${environment.apiUrl}/skill-proposals/`).flush({
      count: proposals.length, next: null, previous: null, results: proposals,
    });
    http.expectOne(`${environment.apiUrl}/skill-categories/`).flush([{ id: 3, name: 'DevOps', parent: null }]);
    http.expectOne(`${environment.apiUrl}/skills/`).flush(skills);
    http.expectOne(`${environment.apiUrl}/me/`).flush(meProfile);
  }

  it('reports that approving will add a new catalogue skill', () => {
    fixture.detectChanges();
    flushInit([proposal()], [{ id: 9, name: 'Ansible', category: 3, level_descriptions: [] }]);

    expect(component.proposalOutcome(component.proposals()[0])).toBe('creates');
  });

  it('reports that approving changes nothing when the skill already exists', () => {
    fixture.detectChanges();
    flushInit([proposal()], [{ id: 9, name: 'Terraform', category: 3, level_descriptions: [] }]);

    expect(component.proposalOutcome(component.proposals()[0])).toBe('exists');
  });

  it('recognises an existing skill that differs only in case', () => {
    fixture.detectChanges();
    flushInit(
      [proposal({ skill_name: 'terraform' })],
      [{ id: 9, name: 'Terraform', category: 3, level_descriptions: [] }],
    );

    expect(component.proposalOutcome(component.proposals()[0])).toBe('exists');
  });

  it('treats a matching name in another category as a new skill', () => {
    fixture.detectChanges();
    flushInit([proposal()], [{ id: 9, name: 'Terraform', category: 4, level_descriptions: [] }]);

    expect(component.proposalOutcome(component.proposals()[0])).toBe('creates');
  });

  it('flags a proposal without a category as not approvable', () => {
    fixture.detectChanges();
    flushInit([proposal({ category: null, category_name: null })]);

    expect(component.proposalOutcome(component.proposals()[0])).toBe('no-category');
  });

  it('shows the consequence in the row and disables approval when blocked', () => {
    fixture.detectChanges();
    flushInit([proposal({ category: null, category_name: null })]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No category');

    const approve = el.querySelector('.action-approve') as HTMLButtonElement;
    expect(approve.disabled).toBeTrue();
  });

  it('does not submit without a category', () => {
    fixture.detectChanges();
    flushInit([]);

    component.newSkillName.set('Terraform');
    component.newCategory.set(undefined);
    component.submitProposal();

    // afterEach verifies that no request was made.
    expect(component.newSkillName()).toBe('Terraform');
  });

  it('submits once a category is chosen', () => {
    fixture.detectChanges();
    flushInit([]);

    component.newSkillName.set('Terraform');
    component.newCategory.set(3);
    component.submitProposal();

    const req = http.expectOne(`${environment.apiUrl}/skill-proposals/`);
    expect(req.request.body.category).toBe(3);
    req.flush(proposal());
    http.expectOne((r) => r.url === `${environment.apiUrl}/skill-proposals/`).flush({
      count: 0, next: null, previous: null, results: [],
    });
  });

  it('lists what the chosen category already contains, sorted', () => {
    fixture.detectChanges();
    flushInit([], [
      { id: 1, name: 'Kubernetes', category: 3, level_descriptions: [] },
      { id: 2, name: 'Ansible', category: 3, level_descriptions: [] },
      { id: 3, name: 'Angular', category: 4, level_descriptions: [] },
    ]);

    component.newCategory.set(3);

    expect(component.categorySkills().map((s) => s.name)).toEqual(['Ansible', 'Kubernetes']);
  });

  it('flags a name that already exists in the chosen category', () => {
    fixture.detectChanges();
    flushInit([], [{ id: 1, name: 'Kubernetes', category: 3, level_descriptions: [] }]);

    component.newCategory.set(3);
    component.newSkillName.set('  kubernetes ');

    expect(component.nameTaken()).toBeTrue();
  });

  it('does not flag a name that exists only in another category', () => {
    fixture.detectChanges();
    flushInit([], [{ id: 1, name: 'Kubernetes', category: 4, level_descriptions: [] }]);

    component.newCategory.set(3);
    component.newSkillName.set('Kubernetes');

    expect(component.nameTaken()).toBeFalse();
  });

  it('refuses to submit a name that is already taken', () => {
    fixture.detectChanges();
    flushInit([], [{ id: 1, name: 'Kubernetes', category: 3, level_descriptions: [] }]);

    component.newCategory.set(3);
    component.newSkillName.set('Kubernetes');
    component.submitProposal();

    // afterEach verifies no create request went out.
    expect(component.nameTaken()).toBeTrue();
  });
});
