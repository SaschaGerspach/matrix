import os

os.environ.setdefault('SECRET_KEY', 'e2e-test-secret-key')

from .settings import *  # noqa: F401, F403

DEBUG = True
SECRET_KEY = 'e2e-test-secret-key'

ALLOWED_HOSTS = ['localhost', '127.0.0.1']
CORS_ALLOWED_ORIGINS = ['http://localhost:4200']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db_e2e.sqlite3',
    }
}

REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'user': '10000/minute',
    'anon': '10000/minute',
    'auth': '1000/minute',
}

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
