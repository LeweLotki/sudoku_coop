"""WebSocket connection-gate helpers.

Pure functions for validating the access token and the connection Origin. These
are deliberately framework-agnostic and side-effect free so they can be unit
tested directly. The token value is compared in constant time and is never
returned or logged by these helpers.
"""

from __future__ import annotations

import secrets
from collections.abc import Iterable

# Application close code returned when a connection fails the auth gate.
# In the private 4000-4999 range; 4401 mirrors HTTP 401 Unauthorized.
WS_CLOSE_UNAUTHORIZED = 4401

# Extension pages connect with this Origin scheme.
_EXTENSION_ORIGIN_PREFIX = "chrome-extension://"


def token_is_valid(supplied: str | None, expected: str) -> bool:
    """Return True if ``supplied`` matches ``expected`` in constant time.

    When ``expected`` is empty (development without a configured token), the
    gate is open: any token (including none) is accepted. Production is
    prevented from reaching this state by the settings startup guard.
    """
    if not expected:
        return True
    if not supplied:
        return False
    return secrets.compare_digest(supplied, expected)


def origin_is_allowed(origin: str | None, allowlist: Iterable[str]) -> bool:
    """Return True if ``origin`` may open a WebSocket.

    Allows missing Origin (non-browser/native clients, which cannot be used for
    cross-site hijacking), the ``chrome-extension://`` scheme (the extension),
    and any origin explicitly present in ``allowlist``. Other web-page origins
    are rejected.
    """
    if not origin:
        return True
    if origin.startswith(_EXTENSION_ORIGIN_PREFIX):
        return True
    return origin in set(allowlist)
