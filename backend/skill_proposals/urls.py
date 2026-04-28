from rest_framework.routers import DefaultRouter

from .views import SkillProposalViewSet

router = DefaultRouter()
router.register('skill-proposals', SkillProposalViewSet, basename='skill-proposals')

urlpatterns = router.urls
