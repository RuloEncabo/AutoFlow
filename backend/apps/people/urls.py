from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import OperatorViewSet

router = DefaultRouter()
router.register("", OperatorViewSet, basename="operators")

app_name = "people"

urlpatterns = [
    path("", include(router.urls)),
]
