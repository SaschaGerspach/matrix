from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'type', 'message', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
    list_select_related = ('recipient', 'actor')
    list_per_page = 25
    readonly_fields = ('recipient', 'actor', 'type', 'message', 'created_at')
