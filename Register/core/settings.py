from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = 'django-insecure-i+k*caa5%%t06o&pe-v@^y9+-+!vqfu1*hc@pgd7=y^u5&gtho'
DEBUG = True
ALLOWED_HOSTS = [
    'webtest.namspi.uz',
    'navbat.namspi.uz',
    'localhost',
    '127.0.0.1',
    'testserver'
]
INSTALLED_APPS = [

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_bootstrap5',
    "channels",
    'members',
    'registrator',
    'queueing',
    'rest_framework',
    'api',
]

# if DEBUG:
#     INSTALLED_APPS += ["django_browser_reload"]

AUTH_USER_MODEL = 'members.CustomUser'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    # "django_browser_reload.middleware.BrowserReloadMiddleware",
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'core.urls'
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "templates"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'core.context_processors.global_user_context',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
# ASGI_APPLICATION = 'core.asgi.application'
WSGI_APPLICATION = 'core.wsgi.application'

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ]
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
import os

LANGUAGE_CODE = 'uz'
TIME_ZONE = 'Asia/Tashkent'
USE_I18N = True
USE_TZ = False  # Agar siz lokal vaqtni ishlatmoqchi bo‘lsangiz, False bo‘lishi kerak
STATIC_URL = '/static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]  # agar mavjud bo‘lsa
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LOGIN_URL = '/'  # Ruxsat etilmagan sahifalarga kirganda login sahifasiga yo‘naltiradi
LOGIN_REDIRECT_URL = '/registrator/'  # Muvaffaqiyatli login bo‘lsa qayerga olib boradi
LOGOUT_REDIRECT_URL = '/'  # Logoutdan keyin qayerga yo‘naltiradi

CSRF_TRUSTED_ORIGINS = [
    "https://webtest.namspi.uz",
    "https://navbat.namspi.uz"
]

# Channels default backend (dev uchun)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}
