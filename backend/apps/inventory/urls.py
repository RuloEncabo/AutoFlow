from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InventoryFamilyViewSet, MaterialViewSet, PartViewSet, WorkOrderMaterialViewSet, WorkOrderPartViewSet

router = DefaultRouter()
router.register("families", InventoryFamilyViewSet, basename="inventory-families")
router.register("parts", PartViewSet, basename="parts")
router.register("materials", MaterialViewSet, basename="materials")
router.register("work-order-parts", WorkOrderPartViewSet, basename="work-order-parts")
router.register("work-order-materials", WorkOrderMaterialViewSet, basename="work-order-materials")

app_name = "inventory"

urlpatterns = [
    path("", include(router.urls)),
]
