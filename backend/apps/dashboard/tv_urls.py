from django.urls import path

from .views import TvWorkOrdersView

app_name = "tv_dashboard"

urlpatterns = [
    path("work-orders/", TvWorkOrdersView.as_view(), name="tv-work-orders"),
]
