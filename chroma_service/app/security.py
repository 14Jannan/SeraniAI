"""Shared-secret authentication for the internal Chroma service.

This service is never meant to be reached directly by a browser or mobile
client - only by the Node backend, server-to-server. Every collection is
tenant-unaware (documents from every user live in the same store, separated
only by an application-level `userId` metadata filter), so an unauthenticated
deployment lets anyone who can reach the host read or wipe every user's
journals, chats, and course content. Requiring a shared secret closes that
off without needing full per-user auth here.
"""
import logging

from fastapi import Header, HTTPException

from app.config import CHROMA_SERVICE_API_KEY

logger = logging.getLogger("chroma_service.security")

if not CHROMA_SERVICE_API_KEY:
    logger.warning(
        "CHROMA_SERVICE_API_KEY is not set - this service is running "
        "UNAUTHENTICATED. Set it before deploying anywhere reachable "
        "outside your own machine."
    )


async def require_internal_api_key(x_internal_api_key: str = Header(default="")):
    """Dependency that rejects requests missing the shared internal secret.

    When CHROMA_SERVICE_API_KEY is unset (local development only), this is a
    no-op so existing local workflows keep working unchanged.
    """
    if not CHROMA_SERVICE_API_KEY:
        return
    if x_internal_api_key != CHROMA_SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
