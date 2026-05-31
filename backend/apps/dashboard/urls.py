from django.urls import path

from .views import OperationalDashboardView

app_name = "dashboard"

urlpatterns = [
    path("operational/", OperationalDashboardView.as_view(), name="operational-dashboard"),
]
