"""
SSRF guard.

The crawler and scraper fetch user-supplied URLs server-side, so these
assertions guard a real attack surface: without them the backend can be aimed
at cloud metadata endpoints or internal Docker services.
"""

from __future__ import annotations

import pytest

from app.core.url_guard import UnsafeUrlError, assert_public_url

pytestmark = pytest.mark.asyncio


BLOCKED = [
    pytest.param("http://169.254.169.254/latest/meta-data/", id="aws-metadata"),
    pytest.param("http://169.254.170.2/v2/credentials", id="ecs-credentials"),
    pytest.param("http://127.0.0.1:8000/health", id="loopback-ipv4"),
    pytest.param("http://localhost:5432", id="localhost-hostname"),
    pytest.param("http://[::1]:8000/", id="loopback-ipv6"),
    pytest.param("http://10.0.0.5/admin", id="private-10"),
    pytest.param("http://172.16.0.1/", id="private-172-16"),
    pytest.param("http://192.168.1.1/", id="private-192-168"),
    pytest.param("http://0.0.0.0/", id="unspecified"),
    pytest.param("http://db:5432/", id="docker-service-name"),
    pytest.param("file:///etc/passwd", id="file-scheme"),
    pytest.param("gopher://127.0.0.1:6379/_INFO", id="gopher-scheme"),
]


@pytest.mark.parametrize("url", BLOCKED)
async def test_internal_targets_are_blocked(url):
    with pytest.raises(UnsafeUrlError):
        await assert_public_url(url)


@pytest.mark.parametrize(
    "url",
    ["https://example.com/", "https://www.wikipedia.org/path?q=1"],
)
async def test_public_urls_are_allowed(url):
    await assert_public_url(url)


async def test_url_without_hostname_is_rejected():
    with pytest.raises(UnsafeUrlError):
        await assert_public_url("http:///no-host")


async def test_unresolvable_hostname_is_rejected():
    with pytest.raises(UnsafeUrlError):
        await assert_public_url("https://this-domain-should-not-resolve.invalid/")
