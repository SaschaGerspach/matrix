from rest_framework.routers import DefaultRouter

from .views import SkillAssignmentViewSet, SkillCategoryViewSet, SkillViewSet

router = DefaultRouter()
router.register('skill-categories', SkillCategoryViewSet)
router.register('skills', SkillViewSet)
router.register('skill-assignments', SkillAssignmentViewSet)

urlpatterns = router.urls
