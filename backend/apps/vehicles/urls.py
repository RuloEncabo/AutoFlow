from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import VehicleViewSet

router = DefaultRouter()
router.register("", VehicleViewSet, basename="vehicles")

app_name = "vehicles"

urlpatterns = [
    path("", include(router.urls)),
]

