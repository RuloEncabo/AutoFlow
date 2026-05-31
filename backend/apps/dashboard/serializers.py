from rest_framework import serializers


class DashboardMetricSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    value = serializers.IntegerField()
    helper = serializers.CharField()


class DashboardPrioritySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    order_number = serializers.CharField()
    client_name = serializers.CharField()
    vehicle_label = serializers.CharField()
    plate = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    priority = serializers.CharField()
    priority_label = serializers.CharField()
    estimated_delivery_date = serializers.DateField(allow_null=True)
    progress_percent = serializers.IntegerField()
    delayed = serializers.BooleanField()


class OperationalDashboardSerializer(serializers.Serializer):
    generated_at = serializers.DateTimeField()
    stats = serializers.DictField()
    appointments_today = serializers.DictField()
    stock = serializers.DictField()
    billing = serializers.DictField()
    tasks = serializers.DictField()
    priorities = DashboardPrioritySerializer(many=True)
    recent_activity = serializers.ListField(child=serializers.DictField())


class TvWorkOrderSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    order_number = serializers.CharField()
    client = serializers.CharField()
    vehicle = serializers.CharField()
    plate = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    priority = serializers.CharField()
    priority_label = serializers.CharField()
    estimated_delivery_date = serializers.DateField(allow_null=True)
    tasks_total = serializers.IntegerField()
    tasks_completed = serializers.IntegerField()
    tasks_pending = serializers.IntegerField()
    progress_percent = serializers.IntegerField()
    next_tasks = serializers.ListField(child=serializers.DictField())
    sector_current = serializers.CharField()
    operators = serializers.ListField(child=serializers.CharField())


class TvDashboardSerializer(serializers.Serializer):
    generated_at = serializers.DateTimeField()
    rows = TvWorkOrderSerializer(many=True)
