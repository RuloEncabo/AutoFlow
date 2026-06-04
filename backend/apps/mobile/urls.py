from django.urls import path

from .views import MobileConfigView, MobileReceptionDamageView, MobileReceptionView, PlateRecognitionView

app_name = "mobile"

urlpatterns = [
    path("config/", MobileConfigView.as_view(), name="config"),
    path("plate-recognition/", PlateRecognitionView.as_view(), name="plate-recognition"),
    path("receptions/", MobileReceptionView.as_view(), name="receptions"),
    path("reception-damages/", MobileReceptionDamageView.as_view(), name="reception-damages"),
]
