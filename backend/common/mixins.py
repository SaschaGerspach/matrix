from .audit import log_action
from .models import AuditLog


class AuditMixin:
    audit_entity_type: str = ''

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            entity_type=self.audit_entity_type,
            entity_id=instance.pk,
            detail=str(instance),
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(
            user=self.request.user,
            action=AuditLog.Action.UPDATE,
            entity_type=self.audit_entity_type,
            entity_id=instance.pk,
            detail=str(instance),
        )

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
