#!/usr/bin/env python3
"""
Multi-provider LLM Client with automatic fallback.

Priority: Cerebras (gpt-oss-120b) → Groq (llama-3.3-70b-versatile)

Cerebras is free (1M tokens/day) and doesn't block VPN IPs.
Groq is free (100K tokens/day) but blocks VPN/datacenter IPs intermittently.

Both use OpenAI-compatible APIs, so we use the openai library for both.
"""

import json
import os
import re
import time


# ── Provider Configs ─────────────────────────────────────────────────────────

PROVIDERS = [
    {
        "name": "Cerebras",
        "model": "gpt-oss-120b",
        "base_url": "https://api.cerebras.ai/v1",
        "env_key": "CEREBRAS_API_KEY",
    },
    {
        "name": "Groq",
        "model": "llama-3.3-70b-versatile",
        "base_url": "https://api.groq.com/openai/v1",
        "env_key": "GROQ_API_KEY",
    },
]


def _get_client(provider: dict):
    """Create an OpenAI-compatible client for the given provider."""
    from openai import OpenAI

    api_key = os.environ.get(provider["env_key"], "")
    if not api_key:
        return None
    return OpenAI(api_key=api_key, base_url=provider["base_url"])


def chat_completion(
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 2048,
    max_retries: int = 3,
) -> str:
    """
    Call LLM with automatic provider fallback.
    Tries Cerebras first, then Groq. Returns raw response text.
    Raises RuntimeError if all providers fail.
    """
    last_error = None

    for provider in PROVIDERS:
        client = _get_client(provider)
        if client is None:
            print(f"  [{provider['name']}] No API key set ({provider['env_key']}), skipping.")
            continue

        for attempt in range(1, max_retries + 1):
            try:
                print(f"  Calling {provider['name']}/{provider['model']} (attempt {attempt}/{max_retries})...")
                response = client.chat.completions.create(
                    model=provider["model"],
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

                raw = response.choices[0].message.content
                if raw is None:
                    # Some models (like gpt-oss-120b) may return reasoning but no content
                    # Try to get from reasoning field
                    msg = response.choices[0].message
                    if hasattr(msg, "reasoning") and msg.reasoning:
                        raw = msg.reasoning
                    else:
                        raw = ""

                raw = raw.strip()

                if not raw:
                    print(f"  [{provider['name']}] Empty response, retrying...")
                    continue

                print(f"  Content generated successfully via {provider['name']}.")
                return raw

            except Exception as e:
                err_str = str(e)
                last_error = e

                # 403 = blocked (VPN issue), immediately try next provider
                if "403" in err_str:
                    print(f"  [{provider['name']}] Access denied (403), trying next provider...")
                    break  # Skip remaining retries, go to next provider

                # 429 = rate limited, wait and retry
                if "429" in err_str or "rate" in err_str.lower():
                    wait_secs = 10 * attempt
                    print(f"  [{provider['name']}] Rate limited. Waiting {wait_secs}s...")
                    time.sleep(wait_secs)
                    if attempt == max_retries:
                        break  # Try next provider
                    continue

                # Other errors
                print(f"  [{provider['name']}] Error (attempt {attempt}): {e}")
                if attempt == max_retries:
                    break  # Try next provider

    raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")


def generate_json(
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 2048,
    max_retries: int = 3,
) -> dict | list:
    """
    Call LLM and parse the response as JSON.
    Strips markdown fences, retries on parse errors.
    """
    for attempt in range(1, max_retries + 1):
        try:
            raw = chat_completion(messages, temperature, max_tokens, max_retries=2)

            # Strip markdown code fences if present
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

            data = json.loads(raw)
            return data

        except json.JSONDecodeError as e:
            print(f"  JSON parse error (attempt {attempt}/{max_retries}): {e}")
            if attempt == max_retries:
                raise
        except RuntimeError:
            raise  # All providers failed, don't retry
        except Exception as e:
            print(f"  Unexpected error (attempt {attempt}/{max_retries}): {e}")
            if attempt == max_retries:
                raise

    return {}
