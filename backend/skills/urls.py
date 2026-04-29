from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    MySkillsViewSet,
    RoleTemplateViewSet,
    SkillAssignmentViewSet,
    SkillCategoryViewSet,
    SkillGapsView,
    SkillHistoryViewSet,
    LevelDistributionView,
    SkillMatrixExportView,
    SkillMatrixView,
    SkillRequirementViewSet,
    SkillViewSet,
    TeamAssignmentsViewSet,
    TeamComparisonView,
    KpiView,
    SkillLevelDescriptionViewSet,
    SkillMatrixPdfExportView,
    SkillRecommendationsView,
    SkillTrendsView,
)

router = DefaultRouter()
router.register('my-skills', MySkillsViewSet, basename='my-skills')
router.register('team-assignments', TeamAssignmentsViewSet, basename='team-assignments')
router.register('skill-categories', SkillCategoryViewSet)
router.register('skills', SkillViewSet)
router.register('skill-assignments', SkillAssignmentViewSet)
router.register('skill-requirements', SkillRequirementViewSet)
router.register('skill-level-descriptions', SkillLevelDescriptionViewSet)
router.register('skill-history', SkillHistoryViewSet, basename='skill-history')
router.register('role-templates', RoleTemplateViewSet)

urlpatterns = [
    path('skill-matrix/', SkillMatrixView.as_view(), name='skill-matrix'),
    path('skill-matrix/export/', SkillMatrixExportView.as_view(), name='skill-matrix-export'),
    path('skill-matrix/export-pdf/', SkillMatrixPdfExportView.as_view(), name='skill-matrix-export-pdf'),
    path('skill-gaps/', SkillGapsView.as_view(), name='skill-gaps'),
    path('team-comparison/', TeamComparisonView.as_view(), name='team-comparison'),
    path('skill-trends/', SkillTrendsView.as_view(), name='skill-trends'),
    path('skill-recommendations/', SkillRecommendationsView.as_view(), name='skill-recommendations'),
    path('kpi/', KpiView.as_view(), name='kpi'),
    path('kpi/level-distribution/', LevelDistributionView.as_view(), name='level-distribution'),
] + router.urls
