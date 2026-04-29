from django.contrib import admin

from .models import Department, Team


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent')
    search_fields = ('name',)
    list_filter = ('parent',)
    list_select_related = ('parent',)
    list_per_page = 25


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'department')
    list_filter = ('department',)
    search_fields = ('name',)
    filter_horizontal = ('members', 'team_leads')
    list_select_related = ('department',)
    list_per_page = 25
