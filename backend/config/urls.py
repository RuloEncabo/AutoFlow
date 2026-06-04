"""Root URL configuration for AutoFlow."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/appointments/", include("apps.appointments.urls")),
    path("api/audit/", include("apps.audit.urls")),
    path("api/billing/", include("apps.billing.urls")),
    path("api/clients/", include("apps.clients.urls")),
    path("api/dashboard/", include("apps.dashboard.urls")),
    path("api/operators/", include("apps.people.urls")),
    path("api/receptions/", include("apps.reception.urls")),
    path("api/tasks/", include("apps.work_orders.task_urls")),
    path("api/vehicles/", include("apps.vehicles.urls")),
    path("api/inventory/", include("apps.inventory.urls")),
    path("api/mobile/", include("apps.mobile.urls")),
    path("api/tv-dashboard/", include("apps.dashboard.tv_urls")),
    path("api/work-orders/", include("apps.work_orders.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
