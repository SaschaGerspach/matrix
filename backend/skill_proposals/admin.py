from django.contrib import admin

from .models import SkillProposal


@admin.register(SkillProposal)
class SkillProposalAdmin(admin.ModelAdmin):
    list_display = ('skill_name', 'proposed_by', 'category', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('skill_name',)
