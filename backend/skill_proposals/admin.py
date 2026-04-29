from django.contrib import admin

from .models import SkillProposal


@admin.register(SkillProposal)
class SkillProposalAdmin(admin.ModelAdmin):
    list_display = ('skill_name', 'proposed_by', 'category', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('skill_name',)
    list_select_related = ('proposed_by', 'category', 'reviewed_by')
    list_per_page = 25
