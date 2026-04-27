from rest_framework.routers import DefaultRouter

from .views import DepartmentViewSet, TeamViewSet

router = DefaultRouter()
router.register('departments', DepartmentViewSet)
router.register('teams', TeamViewSet)

urlpatterns = router.urls
