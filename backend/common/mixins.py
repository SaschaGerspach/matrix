from .audit import log_action
from .models import AuditLog


class AuditMixin:
    audit_entity_type: str = ''
    invalidate_cache_on_write: bool = False

    def _invalidate_cache(self):
        if self.invalidate_cache_on_write:
            from skills.views._cache import invalidate_analytics_cache
            invalidate_analytics_cache()

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            entity_type=self.audit_entity_type,
            entity_id=instance.pk,
            detail=str(instance),
        )
        self._invalidate_cache()

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(
            user=self.request.user,
            action=AuditLog.Action.UPDATE,
            entity_type=self.audit_entity_type,
            entity_id=instance.pk,
            detail=str(instance),
        )
        self._invalidate_cache()

    def perform_destroy(self, instance):
        entity_id = instance.pk
        detail = str(instance)
        instance.delete()
        log_action(
            user=self.request.user,
            action=AuditLog.Action.DELETE,
            entity_type=self.audit_entity_type,
            entity_id=entity_id,
            detail=detail,
        )
        self._invalidate_cache()
