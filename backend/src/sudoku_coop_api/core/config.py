"""Application settings (placeholder).

TODO: Implement environment-driven settings in a future change. Planned values:
  - APP_NAME: human-readable application name
  - ENVIRONMENT: e.g. "development" | "production"
  - ALLOWED_ORIGINS: list of CORS origins (the extension origin(s))
  - SESSION_CODE_LENGTH: length of generated session codes (4-6)

Intended approach: a ``pydantic_settings.BaseSettings`` subclass loading from the
environment / a ``.env`` file. Not implemented yet (scaffolding only).
"""

# TODO: from pydantic_settings import BaseSettings
# TODO: class Settings(BaseSettings): ...
# TODO: settings = Settings()
