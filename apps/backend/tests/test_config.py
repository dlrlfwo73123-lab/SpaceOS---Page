import importlib

from app.core import config


def test_default_settings_never_wildcard_cors():
    s = config.load_settings()
    assert "*" not in s.allowed_origins
    assert s.data_mode == "mock"
    assert s.ai_configured is False


def test_allowed_origins_parsed_from_env(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://a.example.com, https://b.example.com")
    s = config.load_settings()
    assert s.allowed_origins == ["https://a.example.com", "https://b.example.com"]


def test_ai_configured_reflects_env(monkeypatch):
    monkeypatch.setenv("AI_API_KEY", "test-key")
    s = config.load_settings()
    assert s.ai_configured is True


def test_module_settings_singleton_importable():
    importlib.reload(config)
    assert config.settings.data_mode == "mock"
