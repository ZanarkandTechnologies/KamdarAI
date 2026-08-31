from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import composio_session
from scripts.setup_cli.flows import connections


PROVIDERS = [
    {
        "mcp": {
            "name": "composio-google",
            "toolkit": "gmail",
            "tools": ["GMAIL_GET_PROFILE"],
        }
    }
]
STATE = {
    "mcp_url": "https://mcp.composio.dev/session/example",
    "toolkits": {"gmail": ["GMAIL_GET_PROFILE"]},
}


class ComposioRepairTests(unittest.TestCase):
    def test_rejected_saved_key_is_replaced_and_saved_after_validation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            profile_home = Path(temporary)
            with (
                patch.object(connections.runtime, "read_profile_secret", return_value="bad-key"),
                patch.object(connections, "_prompt_secret", return_value="good-key") as prompt,
                patch.object(
                    composio_session,
                    "ensure_session",
                    side_effect=[
                        composio_session.ComposioSessionError("composio_http_401"),
                        STATE,
                    ],
                ) as ensure,
                patch.object(connections.runtime, "save_profile_secret") as save,
                patch.object(connections.runtime, "configure_remote_mcp") as configure,
                patch.object(composio_session, "connected_toolkits", return_value={"gmail"}),
                patch.object(connections, "run_visible", return_value=0),
            ):
                connections._configure_composio_connection(
                    profile_home,
                    PROVIDERS,
                    non_interactive=False,
                )

            prompt.assert_called_once_with("Replacement Composio project API key (hidden): ")
            self.assertEqual(ensure.call_args_list[0].args[2], "bad-key")
            self.assertEqual(ensure.call_args_list[1].args[2], "good-key")
            save.assert_called_once_with(profile_home, "COMPOSIO_API_KEY", "good-key")
            configure.assert_called_once_with(
                profile_home,
                "composio-google",
                "https://mcp.composio.dev/session/example",
                headers={"x-api-key": "${COMPOSIO_API_KEY}"},
            )
