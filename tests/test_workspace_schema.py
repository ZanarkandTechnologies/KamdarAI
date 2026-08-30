from __future__ import annotations

import unittest

from pydantic import ValidationError

from schemas.workspace import (
    CommunicationBinding,
    DeliveryBehavior,
    MessageType,
    MessagingApp,
    RecipientRule,
    configuration_hash,
    parse_workspace_communications,
)


class WorkspaceSchemaTests(unittest.TestCase):
    def binding(self, **overrides: object) -> CommunicationBinding:
        values: dict[str, object] = {
            "message": MessageType.OWNER_REPORT,
            "app": MessagingApp.TELEGRAM,
            "send_to": "company owner",
            "behavior": DeliveryBehavior.PREPARE_DRAFTS,
        }
        values.update(overrides)
        return CommunicationBinding.model_validate(values)

    def test_owner_policy_is_derived_instead_of_customer_input(self) -> None:
        binding = self.binding()
        self.assertEqual(binding.recipient_rule, RecipientRule.NAMED_OWNER)
        self.assertNotIn("recipient_rule", binding.model_dump())

    def test_employee_automatic_send_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValidationError, "People-directory"):
            self.binding(
                message=MessageType.EMPLOYEE_FOLLOW_UP,
                behavior=DeliveryBehavior.SEND_AUTOMATICALLY,
            )

    def test_connection_test_is_not_a_durable_message_type(self) -> None:
        with self.assertRaises(ValueError):
            MessageType("connection test")

    def test_managed_table_parses_customer_fields_only(self) -> None:
        content = """
<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
| `owner report` | telegram | company owner | prepare drafts for approval |
<!-- /hermes:managed communications -->
"""
        config = parse_workspace_communications(content)
        self.assertEqual(len(config.communications), 1)
        self.assertNotIn("mode", config.communications[0].model_dump())

    def test_empty_messaging_selection_is_valid(self) -> None:
        content = """
<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
<!-- /hermes:managed communications -->
"""
        self.assertEqual(parse_workspace_communications(content).communications, [])

    def test_configuration_hash_changes_with_behavior(self) -> None:
        draft = [self.binding()]
        automatic = [self.binding(behavior=DeliveryBehavior.SEND_AUTOMATICALLY)]
        self.assertNotEqual(configuration_hash(draft), configuration_hash(automatic))


if __name__ == "__main__":
    unittest.main()
