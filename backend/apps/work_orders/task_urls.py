from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TaskTemplateViewSet

router = DefaultRouter()
router.register("", TaskTemplateViewSet, basename="tasks")

app_name = "task_catalog"

urlpatterns = [
    path("", include(router.urls)),
]
