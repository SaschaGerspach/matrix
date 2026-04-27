from django.contrib import admin

from .models import Skill, SkillAssignment, SkillCategory


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
