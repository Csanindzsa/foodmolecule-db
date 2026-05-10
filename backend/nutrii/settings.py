"""
Django settings for nutrii.

Phase 1 / Phase 2 deliverable.
"""

from pathlib import Path

from decouple import config, Csv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Security ───────────────────────────────────────────────────────────────
SECRET_KEY = config("DJANGO_SECRET_KEY")
DEBUG = config("DJANGO_DEBUG", default=False, cast=bool)
DJANGO_ENVIRONMENT = config("DJANGO_ENVIRONMENT", default="production")

ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", default="", cast=Csv())

# ─── Application definition ─────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    # Third-party
    "rest_framework",
    "corsheaders",
    # Local
    "core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "nutrii.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "nutrii.wsgi.application"

# ─── Database ───────────────────────────────────────────────────────────────
import urllib.parse

import dj_database_url

_SUPABASE_URL = config("SUPABASE_URL", default="")
_DATABASE_URL = config("DATABASE_URL", default="")

if _DATABASE_URL:
    # Use explicit DATABASE_URL if provided
    DATABASES = {
        "default": dj_database_url.parse(
            _DATABASE_URL,
            conn_max_age=60,
            conn_health_checks=True,
        )
    }
    # Direct connection for migrations — bypasses PgBouncer pooler
    DATABASES["default"].setdefault("OPTIONS", {})
    DATABASES["default"]["OPTIONS"]["options"] = "-c timezone=UTC"
elif _SUPABASE_URL:
    # Construct DATABASE_URL from SUPABASE_URL + SUPABASE_DB_PASSWORD.
    # Connects directly via db.<ref>.supabase.co (bypasses PgBouncer pooler).
    _parsed = urllib.parse.urlparse(_SUPABASE_URL)
    if not _parsed.hostname:
        raise ValueError(
            f"Could not parse SUPABASE_URL (no hostname): {_SUPABASE_URL!r}"
        )
    _ref = _parsed.hostname.split(".")[0]
    if not _ref:
        raise ValueError(
            f"Could not extract project ref from SUPABASE_URL: {_SUPABASE_URL!r}"
        )
    _db_pw = config("SUPABASE_DB_PASSWORD", default="")
    if not _db_pw:
        raise ValueError(
            "SUPABASE_DB_PASSWORD is required when DATABASE_URL is not set. "
            "Set SUPABASE_DB_PASSWORD to the database password from your Supabase project."
        )
    _encoded_pw = urllib.parse.quote(_db_pw, safe="")
    _constructed_url = (
        f"postgresql://postgres.{_ref}:{_encoded_pw}@db.{_ref}.supabase.co:5432/postgres"
    )
    DATABASES = {
        "default": dj_database_url.parse(
            _constructed_url,
            conn_max_age=60,
            conn_health_checks=True,
        )
    }
    # Direct connection for migrations — bypasses PgBouncer pooler
    DATABASES["default"].setdefault("OPTIONS", {})
    DATABASES["default"]["OPTIONS"]["options"] = "-c timezone=UTC"
else:
    # SQLite fallback for CI/testing — allows pytest to run offline
    # without Supabase. pytest-django manages test DB isolation.
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# ─── Password validation ────────────────────────────────────────────────────
# Keep minimal validators — only used for Django admin superuser.
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

# ─── Internationalization ───────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ─── Static files ───────────────────────────────────────────────────────────
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Media files (food images, molecule structures)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── Django REST Framework ──────────────────────────────────────────────────
# Fully public API — no authentication required.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

if DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"].append(
        "rest_framework.renderers.BrowsableAPIRenderer"
    )

# ─── CORS ───────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173,http://localhost:3000",
    cast=Csv(),
)

# ─── Cache (local memory, no Redis needed) ──────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "nutrii-cache",
    }
}

# ─── Rate Limiting ──────────────────────────────────────────────────────────
RATE_LIMIT_REQUESTS_PER_MINUTE = config(
    "RATE_LIMIT_REQUESTS_PER_MINUTE", default=100, cast=int
)

# ─── Security headers (production only) ─────────────────────────────────────
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
