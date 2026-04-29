import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { ProfileDevPlansComponent } from './profile-dev-plans.component';

const plansResponse = { count: 0, next: null, previous: null, results: [] };

describe('ProfileDevPlansComponent', () => {
  let fixture: ComponentFixture<ProfileDevPlansComponent>;
  let component: ProfileDevPlansComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileDevPlansComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileDevPlansComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('employeeId', 1);
    fixture.componentRef.setInput('canEdit', true);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads plans on init', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${environment.apiUrl}/development-plans/`).flush(plansResponse);

    expect(component.devPlans().length).toBe(0);
  });

  it('toggles form visibility', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${environment.apiUrl}/development-plans/`).flush(plansResponse);

    expect(component.showForm()).toBeFalse();
    component.toggleForm();
    expect(component.showForm()).toBeTrue();
  });

  it('does not create plan with empty title', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${environment.apiUrl}/development-plans/`).flush(plansResponse);

    component.newPlanTitle = '   ';
    component.createPlan();
    http.expectNone(`${environment.apiUrl}/development-plans/`);
  });
});
