from django.contrib import admin

from .models import (
    Department,
    Employee,
    Skill,
    SkillAssignment,
    SkillCategory,
    Team,
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent')
    search_fields = ('name',)
    list_filter = ('parent',)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('last_name', 'first_name', 'email', 'user')
    search_fields = ('last_name', 'first_name', 'email')


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'department')
    list_filter = ('department',)
    search_fields = ('name',)
    filter_horizontal = ('members', 'team_leads')


@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent')
    search_fields = ('name',)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name', 'category')
    list_filter = ('category',)
    search_fields = ('name',)


@admin.register(SkillAssignment)
class SkillAssignmentAdmin(admin.ModelAdmin):
    list_display = ('employee', 'skill', 'level', 'status', 'confirmed_at')
    list_filter = ('status', 'level', 'skill__category')
    search_fields = ('employee__last_name', 'employee__first_name', 'skill__name')
    autocomplete_fields = ('employee', 'skill', 'confirmed_by')
