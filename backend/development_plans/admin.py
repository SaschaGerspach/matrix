from django.contrib import admin

from .models import DevelopmentGoal, DevelopmentPlan


class DevelopmentGoalInline(admin.TabularInline):
    model = DevelopmentGoal
    extra = 0


@admin.register(DevelopmentPlan)
class DevelopmentPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'employee', 'created_at')
    search_fields = ('title', 'employee__first_name', 'employee__last_name')
    inlines = [DevelopmentGoalInline]
