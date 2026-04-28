from rest_framework.routers import DefaultRouter

from .views import CertificateViewSet

router = DefaultRouter()
router.register('certificates', CertificateViewSet, basename='certificates')

urlpatterns = router.urls
