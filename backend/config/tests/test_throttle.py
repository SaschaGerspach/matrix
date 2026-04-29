import importlib
import types

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


def _load_prod_settings():
    spec = importlib.util.spec_from_file_location(
        'config.settings_prod_check',
        str(__import__('pathlib').Path(__file__).resolve().parent.parent / 'settings.py'),
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_prod = _load_prod_settings()


def test_user_throttle_class_is_configured():
    classes = _prod.REST_FRAMEWORK.get('DEFAULT_THROTTLE_CLASSES', ())
    assert 'rest_framework.throttling.UserRateThrottle' in classes


def test_anon_throttle_class_is_configured():
    classes = _prod.REST_FRAMEWORK.get('DEFAULT_THROTTLE_CLASSES', ())
    assert 'rest_framework.throttling.AnonRateThrottle' in classes


def test_user_rate_is_set():
    rates = _prod.REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES', {})
    assert 'user' in rates
    assert rates['user'] == '100/hour'


def test_anon_rate_is_set():
    rates = _prod.REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES', {})
    assert 'anon' in rates
    assert rates['anon'] == '20/hour'


def test_auth_rate_is_preserved():
    rates = _prod.REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES', {})
    assert 'auth' in rates
    assert rates['auth'] == '5/minute'


def test_throttle_classes_exist():
    assert UserRateThrottle is not None
    assert AnonRateThrottle is not None
