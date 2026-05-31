from django.urls import path

from .views import HealthView, WorkshopProfileView

app_name = "core"

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("settings/workshop-profile/", WorkshopProfileView.as_view(), name="workshop-profile"),
]
