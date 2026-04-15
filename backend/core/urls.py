from rest_framework.routers import DefaultRouter

from .views import (
    DepartmentViewSet,
    EmployeeViewSet,
    SkillAssignmentViewSet,
    SkillCategoryViewSet,
    SkillViewSet,
    TeamViewSet,
)

router = DefaultRouter()
router.register('departments', DepartmentViewSet)
router.register('teams', TeamViewSet)
router.register('employees', EmployeeViewSet)
router.register('skill-categories', SkillCategoryViewSet)
router.register('skills', SkillViewSet)
router.register('skill-assignments', SkillAssignmentViewSet)

urlpatterns = router.urls
