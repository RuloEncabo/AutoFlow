from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AuditLogViewSet, SessionAuditViewSet

app_name = "audit"

router = DefaultRouter()
router.register("logs", AuditLogViewSet, basename="audit-log")
router.register("sessions", SessionAuditViewSet, basename="session-audit")

urlpatterns = [
    path("", include(router.urls)),
]
