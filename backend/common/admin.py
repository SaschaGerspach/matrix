from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'entity_type', 'entity_id', 'detail')
    list_filter = ('action', 'entity_type')
    readonly_fields = ('user', 'action', 'entity_type', 'entity_id', 'detail', 'timestamp')
