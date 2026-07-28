"""
SSRF protection for outbound HTTP fetches.

The crawler/scraper fetch arbitrary user-supplied URLs server-side. Without a
guard, a user can point them at addresses that are only reachable *from the
server* — the cloud instance-metadata endpoint (169.254.169.254), internal
Docker services (db:5432, redis:6379, temporal:7233), or anything on the
private network — and read the response back through the app.

Every outbound fetch of a user-supplied URL must go through `safe_get()` (or
call `assert_public_url()` first). Redirects are followed manually so each hop
is re-validated: a public URL that 302s to 169.254.169.254 is still an attack,
and httpx's built-in `follow_redirects=True` would follow it unchecked.

Known limitation: a hostname is resolved here and then resolved again by the
HTTP client when it connects, so a DNS entry that changes between the two
(DNS rebinding) can slip past. Closing that fully means pinning the validated
IP into the connection; the check below stops the practical attacks (metadata
endpoints, internal hostnames, literal private IPs, redirect chains).
"""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import socket
from urllib.parse import urljoin, urlparse

import httpx

logger = logging.getLogger(__name__)

MAX_REDIRECTS = 5

IpAddress = ipaddress.IPv4Address | ipaddress.IPv6Address


class UnsafeUrlError(ValueError):
    """Raised when a URL targets a non-public (internal) network address."""


def _is_blocked_ip(ip: IpAddress) -> bool:
    """True if `ip` is anything other than a normal public internet address."""
    # ::ffff:127.0.0.1 style addresses must be judged on the IPv4 they wrap.
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped

    return (
        # Covers 10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, fc00::/7, ::1.
        ip.is_private
        or ip.is_loopback
        # 169.254.0.0/16 — cloud instance metadata (AWS/GCP/Azure) lives here.
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


async def _resolve_all(host: str) -> list[IpAddress]:
    """Resolve `host` to every address it maps to, without blocking the loop."""
    loop = asyncio.get_running_loop()
    try:
        infos = await loop.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise UnsafeUrlError(f"Could not resolve host '{host}'.") from exc

    addresses: list[IpAddress] = []
    for info in infos:
        sockaddr = info[4]
        try:
            addresses.append(ipaddress.ip_address(sockaddr[0]))
        except ValueError:
            continue
    if not addresses:
        raise UnsafeUrlError(f"Could not resolve host '{host}'.")
    return addresses


async def assert_public_url(url: str) -> None:
    """Raise UnsafeUrlError unless `url` is http(s) on a public IP address."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise UnsafeUrlError("Only http(s) URLs can be fetched.")

    host = parsed.hostname
    if not host:
        raise UnsafeUrlError("URL is missing a hostname.")

    # A literal IP in the URL never needs DNS.
    try:
        literal_ip = ipaddress.ip_address(host)
    except ValueError:
        literal_ip = None

    candidates = [literal_ip] if literal_ip is not None else await _resolve_all(host)

    for ip in candidates:
        if _is_blocked_ip(ip):
            # Deliberately vague to the caller — don't confirm what's reachable
            # internally — but log the detail for operators.
            logger.warning("Blocked SSRF attempt: %s resolved to %s", url, ip)
            raise UnsafeUrlError(
                "That URL points to a private or internal address and cannot be fetched."
            )


async def safe_get(
    client: httpx.AsyncClient,
    url: str,
    *,
    max_redirects: int = MAX_REDIRECTS,
) -> httpx.Response:
    """
    GET `url`, validating the target before every hop.

    `client` must be built with `follow_redirects=False` so redirects surface
    here and can be re-checked instead of being followed blindly.
    """
    current = url
    for _ in range(max_redirects + 1):
        await assert_public_url(current)
        response = await client.get(current)

        if not response.is_redirect:
            return response

        location = response.headers.get("location")
        if not location:
            return response
        current = urljoin(str(response.url), location)

    raise UnsafeUrlError("Too many redirects.")
