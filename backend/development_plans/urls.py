from rest_framework.routers import DefaultRouter

from .views import DevelopmentGoalViewSet, DevelopmentPlanViewSet

router = DefaultRouter()
router.register('development-plans', DevelopmentPlanViewSet, basename='development-plans')
router.register('development-goals', DevelopmentGoalViewSet, basename='development-goals')

urlpatterns = router.urls
