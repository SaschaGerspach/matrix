from django.contrib import admin

from .models import (
    RoleTemplate,
    RoleTemplateSkill,
    Skill,
    SkillAssignment,
    SkillAssignmentHistory,
    SkillCategory,
    SkillLevelDescription,
    SkillRequirement,
)


@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent')
    search_fields = ('name',)
    list_select_related = ('parent',)
    list_per_page = 25


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name', 'category')
    list_filter = ('category',)
    search_fields = ('name',)
    list_select_related = ('category',)
    list_per_page = 25


@admin.register(SkillLevelDescription)
class SkillLevelDescriptionAdmin(admin.ModelAdmin):
    list_display = ('skill', 'level', 'description')
    list_filter = ('level', 'skill__category')
    autocomplete_fields = ('skill',)
    list_select_related = ('skill',)
    list_per_page = 25


@admin.register(SkillAssignment)
class SkillAssignmentAdmin(admin.ModelAdmin):
    list_display = ('employee', 'skill', 'level', 'status', 'confirmed_at')
    list_filter = ('status', 'level', 'skill__category')
    search_fields = ('employee__last_name', 'employee__first_name', 'skill__name')
    autocomplete_fields = ('employee', 'skill', 'confirmed_by')
    list_select_related = ('employee', 'skill', 'confirmed_by')
    list_per_page = 25


@admin.register(SkillAssignmentHistory)
class SkillAssignmentHistoryAdmin(admin.ModelAdmin):
    list_display = ('employee', 'skill', 'action', 'old_level', 'new_level', 'changed_by', 'timestamp')
    list_filter = ('action',)
    readonly_fields = ('assignment', 'employee', 'skill', 'old_level', 'new_level', 'action', 'changed_by', 'timestamp')
    list_select_related = ('employee', 'skill', 'changed_by')
    list_per_page = 25


@admin.register(SkillRequirement)
class SkillRequirementAdmin(admin.ModelAdmin):
    list_display = ('team', 'skill', 'required_level')
    list_filter = ('team', 'skill__category')
    autocomplete_fields = ('team', 'skill')
    list_select_related = ('team', 'skill')
    list_per_page = 25


class RoleTemplateSkillInline(admin.TabularInline):
    model = RoleTemplateSkill
    extra = 1
    autocomplete_fields = ('skill',)


@admin.register(RoleTemplate)
class RoleTemplateAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    inlines = (RoleTemplateSkillInline,)
