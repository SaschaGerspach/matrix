from django.contrib import admin

from .models import Certificate


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('name', 'employee', 'skill', 'issuer', 'expiry_date')
    list_filter = ('expiry_date',)
    search_fields = ('name', 'issuer', 'employee__first_name', 'employee__last_name')
