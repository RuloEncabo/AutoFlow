from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TaskTemplateViewSet, WorkOrderTaskViewSet, WorkOrderViewSet

router = DefaultRouter()
router.register("catalog", TaskTemplateViewSet, basename="task-catalog")
router.register("tasks", WorkOrderTaskViewSet, basename="work-order-tasks")
router.register("", WorkOrderViewSet, basename="work-orders")

app_name = "work_orders"

urlpatterns = [
    path("", include(router.urls)),
]
