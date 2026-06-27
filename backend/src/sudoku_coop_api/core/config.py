"""Application settings.

Environment-driven configuration loaded from the process environment and an
optional ``.env`` file. Values can be overridden per environment without code
changes.
"""

from typing import Annotated

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Uppercase alphanumeric alphabet for session codes, excluding ambiguous
# characters (no O/0, I/1) to keep codes easy to read and share aloud.
DEFAULT_SESSION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


class Settings(BaseSettings):
    """Runtime settings for the SudokuPad coop backend."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "sudoku-coop-api"
    environment: str = "development"

    # Comma-separated list in the environment (e.g. the extension origin(s)).
    # NoDecode disables pydantic-settings' default JSON parsing so the
    # comma-splitting validator below receives the raw string instead.
    allowed_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    # --- Security ---
    # Invite-style access token required on every /ws connection. Empty is only
    # tolerated in development (see the startup guard below); production must set
    # a long random value. The token is never logged.
    access_token: str = ""

    # Extra WebSocket Origins allowed beyond the chrome-extension:// scheme.
    # Comma-separated in the environment. Web-page origins not listed here are
    # rejected to mitigate cross-site WebSocket hijacking.
    allowed_ws_origins: Annotated[list[str], NoDecode] = []

    session_code_length: int = 8
    session_code_alphabet: str = DEFAULT_SESSION_CODE_ALPHABET

    # --- Session lifecycle ---
    session_ttl_seconds: int = 7200  # 2 hours

    # --- Per-connection / capacity limits ---
    max_messages_per_10_seconds: int = 30
    max_invalid_messages_per_connection: int = 10
    max_message_bytes: int = 2048
    max_active_sessions: int = 50
    max_guests_per_session: int = 5

    @field_validator("allowed_origins", "allowed_ws_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def _require_token_outside_development(self) -> "Settings":
        # Never silently disable auth in production: a non-development
        # environment must configure a non-empty ACCESS_TOKEN.
        if self.environment.lower() != "development" and not self.access_token:
            raise ValueError("ACCESS_TOKEN must be set when ENVIRONMENT is not 'development'")
        return self


settings = Settings()
