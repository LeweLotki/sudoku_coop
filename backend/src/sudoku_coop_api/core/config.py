"""Application settings.

Environment-driven configuration loaded from the process environment and an
optional ``.env`` file. Values can be overridden per environment without code
changes.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Uppercase alphanumeric alphabet for session codes, excluding ambiguous
# characters (no O/0, I/1) to keep codes easy to read and share aloud.
DEFAULT_SESSION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


class Settings(BaseSettings):
    """Runtime settings for the SudokuPad coop backend."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "sudoku-coop-api"
    environment: str = "development"

    # Comma-separated list in the environment (e.g. the extension origin(s)).
    allowed_origins: list[str] = ["http://localhost:5173"]

    session_code_length: int = 4
    session_code_alphabet: str = DEFAULT_SESSION_CODE_ALPHABET

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
