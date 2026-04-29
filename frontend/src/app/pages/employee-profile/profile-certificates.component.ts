import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { TranslateModule } from '@ngx-translate/core';

import { Certificate, CertificateService } from '../../core/certificate.service';
import { Skill } from '../../core/skill.models';

@Component({
  selector: 'app-profile-certificates',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    TranslateModule,
  ],
  templateUrl: './profile-certificates.component.html',
  styleUrl: './profile-certificates.component.scss',
})
export class ProfileCertificatesComponent implements OnInit {
  readonly employeeId = input.required<number>();
  readonly canEdit = input(false);
  readonly skills = input<Skill[]>([]);

  private readonly certificateService = inject(CertificateService);

  readonly certificates = signal<Certificate[]>([]);
  readonly showForm = signal(false);
  readonly columns = ['name', 'skill_name', 'issuer', 'expiry_date', 'file', 'actions'];

  certName = '';
  certIssuer = '';
  certIssuedDate = '';
  certExpiryDate = '';
  certSkill: number | undefined;
  certFile: File | null = null;
  certFileError = '';

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  private readonly ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

  ngOnInit(): void {
    this.loadCertificates();
  }

  loadCertificates(): void {
    this.certificateService.list(this.employeeId()).subscribe({
      next: (res) => this.certificates.set(res.results),
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.certFileError = '';
    if (file) {
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        this.certFileError = 'CERTIFICATES.INVALID_FILE_TYPE';
        this.certFile = null;
        return;
      }
      if (file.size > this.MAX_FILE_SIZE) {
        this.certFileError = 'CERTIFICATES.FILE_TOO_LARGE';
        this.certFile = null;
        return;
      }
    }
    this.certFile = file;
  }

  save(): void {
    if (!this.certName.trim()) return;
    const formData = new FormData();
    formData.append('employee', String(this.employeeId()));
    formData.append('name', this.certName.trim());
    if (this.certIssuer.trim()) formData.append('issuer', this.certIssuer.trim());
    if (this.certIssuedDate) formData.append('issued_date', this.certIssuedDate);
    if (this.certExpiryDate) formData.append('expiry_date', this.certExpiryDate);
    if (this.certSkill) formData.append('skill', String(this.certSkill));
    if (this.certFile) formData.append('file', this.certFile);
    this.certificateService.create(formData).subscribe({
      next: () => {
        this.resetForm();
        this.loadCertificates();
      },
      error: () => this.loadCertificates(),
    });
  }

  deleteCertificate(id: number): void {
    this.certificateService.delete(id).subscribe({
      next: () => this.loadCertificates(),
      error: () => this.loadCertificates(),
    });
  }

  isExpired(date: string | null): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  isExpiringSoon(date: string | null): boolean {
    if (!date) return false;
    const expiry = new Date(date);
    const now = new Date();
    const inThreeMonths = new Date();
    inThreeMonths.setMonth(inThreeMonths.getMonth() + 3);
    return expiry >= now && expiry <= inThreeMonths;
  }

  private resetForm(): void {
    this.certName = '';
    this.certIssuer = '';
    this.certIssuedDate = '';
    this.certExpiryDate = '';
    this.certSkill = undefined;
    this.certFile = null;
    this.showForm.set(false);
  }
}
