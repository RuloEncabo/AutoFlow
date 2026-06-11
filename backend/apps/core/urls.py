from django.urls import path

from .views import AiChatView, HealthView, WorkshopEmailTestView, WorkshopProfileView

app_name = "core"

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("ai/chat/", AiChatView.as_view(), name="ai-chat"),
    path("settings/workshop-profile/", WorkshopProfileView.as_view(), name="workshop-profile"),
    path("settings/workshop-profile/test-email/", WorkshopEmailTestView.as_view(), name="workshop-profile-test-email"),
]
