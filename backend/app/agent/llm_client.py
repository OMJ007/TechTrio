"""Unified LLM client module for Groq and Anthropic APIs.

Consolidates provider resolution, authentication, request formatting, timeout handling,
response parsing, and response sanitisation (<think> stripping, JSON fence cleaning).
"""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncGenerator

import httpx

from app.agent.thinking_filter import strip_json_fences, strip_thinking_blocks
from app.core.config import settings

logger = logging.getLogger(__name__)

_DEFAULT_TIMEOUT_SECS = 45


def get_llm_credentials() -> tuple[str | None, str]:
    """Return tuple of ``(api_key, provider_type)`` where provider_type is 'groq', 'anthropic', or 'none'."""
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.get_secret_value():
        return settings.GROQ_API_KEY.get_secret_value(), "groq"
    if settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_API_KEY.get_secret_value():
        return settings.ANTHROPIC_API_KEY.get_secret_value(), "anthropic"
    return None, "none"


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    *,
    max_tokens: int = 2048,
    temperature: float = 0.1,
    is_json: bool = False,
    timeout_secs: float = _DEFAULT_TIMEOUT_SECS,
) -> tuple[str, bool]:
    """Execute an async non-streaming LLM call.

    Returns ``(reply_text, success)``.
    """
    api_key, provider = get_llm_credentials()
    if not api_key:
        return "LLM service is not configured (missing API key).", False

    try:
        async with httpx.AsyncClient(timeout=timeout_secs) as client:
            if provider == "groq":
                body: dict[str, Any] = {
                    "model": settings.GROQ_MODEL,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                }
                if is_json:
                    body["response_format"] = {"type": "json_object"}

                resp = await client.post(
                    settings.GROQ_API_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                )
                resp.raise_for_status()
                data: dict[str, Any] = resp.json()
                text = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                    .strip()
                )
            else:
                resp = await client.post(
                    settings.ANTHROPIC_API_URL,
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": settings.ANTHROPIC_MODEL,
                        "max_tokens": max_tokens,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": user_prompt}],
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                content_blocks = data.get("content", [])
                text = content_blocks[0].get("text", "").strip() if content_blocks else ""

        text = strip_thinking_blocks(text)
        if is_json:
            text = strip_json_fences(text)

        return text, bool(text)

    except Exception as exc:  # noqa: BLE001
        logger.exception("Async LLM call failed (%s): %s", provider, exc)
        return "The LLM service is currently unavailable.", False


def call_llm_sync(
    system_prompt: str,
    user_prompt: str,
    *,
    max_tokens: int = 2048,
    temperature: float = 0.1,
    is_json: bool = False,
    timeout_secs: float = _DEFAULT_TIMEOUT_SECS,
) -> tuple[str, bool]:
    """Execute a synchronous non-streaming LLM call (for threadpool tasks).

    Returns ``(reply_text, success)``.
    """
    api_key, provider = get_llm_credentials()
    if not api_key:
        return "LLM service is not configured (missing API key).", False

    try:
        with httpx.Client(timeout=timeout_secs) as client:
            if provider == "groq":
                body: dict[str, Any] = {
                    "model": settings.GROQ_MODEL,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                }
                if is_json:
                    body["response_format"] = {"type": "json_object"}

                resp = client.post(
                    settings.GROQ_API_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                )
                resp.raise_for_status()
                data: dict[str, Any] = resp.json()
                text = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                    .strip()
                )
            else:
                resp = client.post(
                    settings.ANTHROPIC_API_URL,
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": settings.ANTHROPIC_MODEL,
                        "max_tokens": max_tokens,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": user_prompt}],
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                content_blocks = data.get("content", [])
                text = content_blocks[0].get("text", "").strip() if content_blocks else ""

        text = strip_thinking_blocks(text)
        if is_json:
            text = strip_json_fences(text)

        return text, bool(text)

    except Exception as exc:  # noqa: BLE001
        logger.exception("Sync LLM call failed (%s): %s", provider, exc)
        return "The LLM service is currently unavailable.", False


async def stream_llm(
    system_prompt: str,
    user_prompt: str,
    *,
    max_tokens: int = 4096,
    timeout_secs: float = _DEFAULT_TIMEOUT_SECS,
) -> AsyncGenerator[str, None]:
    """Yield text tokens as they arrive from the LLM provider, with reasoning block filtering."""
    api_key, provider = get_llm_credentials()
    if not api_key:
        yield "I'm sorry, the AI advisor service is not configured (missing API key)."
        return

    if provider == "groq":
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": settings.GROQ_MODEL,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": True,
        }
        url = settings.GROQ_API_URL
    else:
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": settings.ANTHROPIC_MODEL,
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "stream": True,
        }
        url = settings.ANTHROPIC_API_URL

    try:
        async with httpx.AsyncClient(timeout=timeout_secs) as client:
            async with client.stream("POST", url, headers=headers, json=body) as resp:
                resp.raise_for_status()

                if provider == "groq":
                    in_think_buffer = True
                    think_acc = ""
                    async for line in resp.aiter_lines():
                        line = line.strip()
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            data: dict[str, Any] = json.loads(data_str)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if not content:
                                continue

                            if in_think_buffer:
                                think_acc += content
                                if "</think>" in think_acc:
                                    content_after = think_acc.split("</think>", 1)[1]
                                    in_think_buffer = False
                                    if content_after:
                                        yield content_after
                                elif "<think>" not in think_acc and len(think_acc) > 20:
                                    in_think_buffer = False
                                    yield think_acc
                            else:
                                yield content
                        except json.JSONDecodeError:
                            pass
                else:
                    event_type: str | None = None
                    async for line in resp.aiter_lines():
                        line = line.strip()
                        if not line:
                            continue
                        if line.startswith("event: "):
                            event_type = line[7:]
                        elif line.startswith("data: "):
                            data_str = line[6:]
                            if event_type == "content_block_delta":
                                try:
                                    data = json.loads(data_str)
                                    delta = data.get("delta", {})
                                    if delta.get("type") == "text_delta":
                                        text: str = delta.get("text", "")
                                        if text:
                                            yield text
                                except json.JSONDecodeError:
                                    pass
                            event_type = None

    except httpx.HTTPStatusError as exc:
        logger.error("LLM API streaming error: %s", exc)
        yield f"\n\n[The advisor service encountered an error: HTTP {exc.response.status_code}]"
    except httpx.TimeoutException:
        yield "\n\n[The advisor service timed out. Please try again.]"
    except Exception:  # noqa: BLE001
        logger.exception("Unexpected LLM streaming error")
        yield "\n\n[An unexpected error occurred. Please try again.]"
