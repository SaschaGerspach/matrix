from .settings import *  # noqa: F401, F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'user': '10000/minute',
    'anon': '10000/minute',
    'auth': '5/minute',
}
