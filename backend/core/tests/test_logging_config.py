from django.conf import settings


def test_django_logging_uses_stdout_console_handler():
    logging_config = settings.LOGGING

    assert logging_config["disable_existing_loggers"] is False
    assert logging_config["handlers"]["console"]["class"] == "logging.StreamHandler"
    assert logging_config["root"]["handlers"] == ["console"]


def test_analytics_logger_emits_info_level_events():
    analytics_logger = settings.LOGGING["loggers"]["nutrii.analytics"]

    assert analytics_logger["level"] == "INFO"
