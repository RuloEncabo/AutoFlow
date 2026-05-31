from __future__ import annotations

import json

from django.core.serializers.json import DjangoJSONEncoder
from django.forms.models import model_to_dict
from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import create_audit_log


def snapshot_instance(instance):
    data = model_to_dict(instance)
    data["id"] = str(instance.pk)
    return json.loads(json.dumps(data, cls=DjangoJSONEncoder, default=str))


class AuditModelViewSet(viewsets.ModelViewSet):
    audit_module = ""

    def get_audit_module(self) -> str:
        return self.audit_module or self.basename

    def _save_kwargs_with_user(self, create: bool = False):
        fields = {field.name for field in self.get_serializer().Meta.model._meta.fields}
        kwargs = {}
        if create and "created_by" in fields:
            kwargs["created_by"] = self.request.user
        if "updated_by" in fields:
            kwargs["updated_by"] = self.request.user
        return kwargs

    def perform_create(self, serializer):
        instance = serializer.save(**self._save_kwargs_with_user(create=True))
        create_audit_log(
            request=self.request,
            module=self.get_audit_module(),
            action=AuditAction.CREATE,
            object_type=instance.__class__.__name__,
            object_id=instance.pk,
            new_data=snapshot_instance(instance),
        )

    def perform_update(self, serializer):
        old_data = snapshot_instance(self.get_object())
        instance = serializer.save(**self._save_kwargs_with_user())
        create_audit_log(
            request=self.request,
            module=self.get_audit_module(),
            action=AuditAction.UPDATE,
            object_type=instance.__class__.__name__,
            object_id=instance.pk,
            old_data=old_data,
            new_data=snapshot_instance(instance),
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        old_data = snapshot_instance(instance)
        self.perform_destroy(instance)
        create_audit_log(
            request=request,
            module=self.get_audit_module(),
            action=AuditAction.DELETE,
            object_type=instance.__class__.__name__,
            object_id=instance.pk,
            old_data=old_data,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

