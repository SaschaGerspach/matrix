import hashlib

from django.core.cache import cache

CACHE_TTL = 300

CACHE_KEYS_PREFIX = 'analytics_'
CACHE_KEYS_REGISTRY = 'analytics_known_keys'


def _cache_key(view_name, **params):
    raw = f"{view_name}:{sorted(params.items())}"
    return CACHE_KEYS_PREFIX + hashlib.sha256(raw.encode()).hexdigest()


def _register_cache_key(key):
    known = cache.get(CACHE_KEYS_REGISTRY) or set()
    known.add(key)
    cache.set(CACHE_KEYS_REGISTRY, known, None)


def invalidate_analytics_cache():
    # Redis supports wildcard deletion; LocMemCache does not,
    # so we fall back to a manually maintained key registry.
    if hasattr(cache, 'delete_pattern'):
        cache.delete_pattern(f'{CACHE_KEYS_PREFIX}*')
    else:
        known = cache.get(CACHE_KEYS_REGISTRY) or set()
        for key in known:
            cache.delete(key)
        cache.delete(CACHE_KEYS_REGISTRY)
