from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    MySkillsViewSet,
    SkillAssignmentViewSet,
    SkillCategoryViewSet,
    SkillGapsView,
    SkillHistoryViewSet,
    SkillMatrixExportView,
    SkillMatrixView,
    SkillRequirementViewSet,
    SkillViewSet,
    TeamAssignmentsViewSet,
    TeamComparisonView,
    SkillTrendsView,
)

router = DefaultRouter()
router.register('my-skills', MySkillsViewSet, basename='my-skills')
router.register('team-assignments', TeamAssignmentsViewSet, basename='team-assignments')
router.register('skill-categories', SkillCategoryViewSet)
router.register('skills', SkillViewSet)
router.register('skill-assignments', SkillAssignmentViewSet)
router.register('skill-requirements', SkillRequirementViewSet)
router.register('skill-history', SkillHistoryViewSet, basename='skill-history')

urlpatterns = [
    path('skill-matrix/', SkillMatrixView.as_view(), name='skill-matrix'),
    path('skill-matrix/export/', SkillMatrixExportView.as_view(), name='skill-matrix-export'),
    path('skill-gaps/', SkillGapsView.as_view(), name='skill-gaps'),
    path('team-comparison/', TeamComparisonView.as_view(), name='team-comparison'),
    path('skill-trends/', SkillTrendsView.as_view(), name='skill-trends'),
] + router.urls
