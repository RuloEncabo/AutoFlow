from __future__ import annotations

import logging

from .models import AuditLog, SessionAudit

audit_logger = logging.getLogger("audit")


def get_client_ip(request) -> str | None:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def create_audit_log(
    *,
    request=None,
    user=None,
    module: str,
    action: str,
    object_type: str = "",
    object_id: str = "",
    old_data=None,
    new_data=None,
) -> AuditLog:
    resolved_user = user or getattr(request, "user", None)
    if resolved_user and not getattr(resolved_user, "is_authenticated", False):
        resolved_user = None

    session_key = ""
    if request:
        session_key = getattr(getattr(request, "session", None), "session_key", "") or ""

    entry = AuditLog.objects.create(
        user=resolved_user,
        module=module,
        action=action,
        object_type=object_type,
        object_id=str(object_id) if object_id else "",
        old_data=old_data,
        new_data=new_data,
        ip_address=get_client_ip(request) if request else None,
        session_key=session_key,
    )
    audit_logger.info("%s %s %s", module, action, object_id)
    return entry


def create_session_audit(*, request=None, user=None, event: str, metadata=None) -> SessionAudit:
    resolved_user = user or getattr(request, "user", None)
    if resolved_user and not getattr(resolved_user, "is_authenticated", False):
        resolved_user = None

    session_key = ""
    if request:
        session_key = getattr(getattr(request, "session", None), "session_key", "") or ""

    entry = SessionAudit.objects.create(
        user=resolved_user,
        event=event,
        ip_address=get_client_ip(request) if request else None,
        user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
        session_key=session_key,
        metadata=metadata,
    )
    audit_logger.info("session %s user=%s", event, getattr(resolved_user, "id", None))
    return entry
