from rest_framework.routers import DefaultRouter

from .views import MySkillsViewSet, SkillAssignmentViewSet, SkillCategoryViewSet, SkillViewSet, TeamAssignmentsViewSet

router = DefaultRouter()
router.register('my-skills', MySkillsViewSet, basename='my-skills')
router.register('team-assignments', TeamAssignmentsViewSet, basename='team-assignments')
router.register('skill-categories', SkillCategoryViewSet)
router.register('skills', SkillViewSet)
router.register('skill-assignments', SkillAssignmentViewSet)

urlpatterns = router.urls
