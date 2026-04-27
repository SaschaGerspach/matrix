import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { MySkillsComponent } from './my-skills.component';

describe('MySkillsComponent', () => {
  let fixture: ComponentFixture<MySkillsComponent>;
  let component: MySkillsComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MySkillsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MySkillsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads my skills on init', () => {
    fixture.detectChanges();

    const req = http.expectOne(`${environment.apiUrl}/my-skills/`);
    req.flush([
      { id: 1, skill: 1, skill_name: 'Python', category_name: 'Programming', level: 3, status: 'pending', confirmed_at: null, created_at: '2026-01-01' },
    ]);

    expect(component.data().length).toBe(1);
    expect(component.loading()).toBeFalse();
  });

  it('shows empty state when no skills', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/my-skills/`).flush([]);

    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No skills assigned yet');
  });
});
