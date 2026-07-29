"""Sanitisation utilities for LLM response text.

Handles removal of reasoning/thinking blocks (e.g., `<think>...</think>`) and
cleaning of JSON code-fence formatting.
"""

from __future__ import annotations


def strip_thinking_blocks(text: str) -> str:
    """Remove reasoning `<think>...</think>` blocks produced by models like Qwen.

    If a closed `</think>` tag is found, returns everything after it.
    If an unclosed `<think>` tag is present at the beginning, strips it.
    """
    if not text:
        return ""

    if "<think>" in text and "</think>" in text:
        return text.split("</think>")[-1].strip()

    if text.startswith("<think>"):
        # Handle unclosed think tag
        parts = text.split("</think>", 1)
        if len(parts) > 1:
            return parts[1].strip()
        return ""

    return text.strip()


def strip_json_fences(text: str) -> str:
    """Remove markdown code fences (e.g. ```json ... ```) from JSON response strings."""
    if not text:
        return ""

    cleaned = text.strip()
    if "```" in cleaned:
        parts = cleaned.split("```")
        if len(parts) >= 2:
            cleaned = parts[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
            cleaned = cleaned.strip()

    return cleaned
