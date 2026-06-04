from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ReceptionDamageViewSet, VehicleReceptionViewSet

app_name = "reception"

router = DefaultRouter()
router.register("damages", ReceptionDamageViewSet, basename="reception-damages")
router.register("", VehicleReceptionViewSet, basename="vehicle-receptions")

urlpatterns = [
    path("", include(router.urls)),
]
