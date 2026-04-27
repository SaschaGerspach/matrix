import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { SkillGapsComponent } from './skill-gaps.component';

const gapData = [
  {
    employee_id: 1, employee_name: 'Alice A', team_name: 'Core',
    skill_id: 10, skill_name: 'Python', category_name: 'Programming',
    required_level: 4, actual_level: 2, gap: 2,
  },
];

describe('SkillGapsComponent', () => {
  let fixture: ComponentFixture<SkillGapsComponent>;
  let component: SkillGapsComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillGapsComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillGapsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads skill gaps on init', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/skill-gaps/`).flush(gapData);

    expect(component.data().length).toBe(1);
    expect(component.data()[0].gap).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('shows empty state when no gaps', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/skill-gaps/`).flush([]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No skill gaps found');
  });

  it('renders gap data in table', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/skill-gaps/`).flush(gapData);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Alice A');
    expect(el.textContent).toContain('Python');
    expect(el.textContent).toContain('-2');
  });
});
