"""
LLMService._safe_json_object — the fallback that salvages JSON from a model
response.

Chat models routinely wrap JSON in prose or ```json fences, so the parser
retries by slicing between the outermost braces. These tests pin both the
salvage behaviour and the failure modes.
"""

from __future__ import annotations

import pytest

from app.services.llm_service import LLMService, LLMServiceError

parse = LLMService._safe_json_object


class TestCleanJson:
    def test_plain_object(self):
        assert parse('{"keyword": "ai seo", "score": 87}') == {
            "keyword": "ai seo",
            "score": 87,
        }

    def test_nested_object(self):
        parsed = parse('{"outer": {"inner": [1, 2, 3]}}')
        assert parsed["outer"]["inner"] == [1, 2, 3]

    def test_whitespace_is_tolerated(self):
        assert parse('\n\t  {"ok": true}  \n') == {"ok": True}


class TestSalvagedJson:
    def test_markdown_fenced_json(self):
        raw = '```json\n{"prompts": ["a", "b"]}\n```'
        assert parse(raw) == {"prompts": ["a", "b"]}

    def test_prose_before_and_after(self):
        raw = 'Sure! Here is the result:\n{"score": 42}\nLet me know if you need more.'
        assert parse(raw) == {"score": 42}

    def test_uses_outermost_braces(self):
        raw = 'Result: {"a": {"b": 1}} — done'
        assert parse(raw) == {"a": {"b": 1}}


class TestRejectedResponses:
    def test_empty_string(self):
        with pytest.raises(LLMServiceError):
            parse("")

    def test_no_braces_at_all(self):
        with pytest.raises(LLMServiceError):
            parse("I'm sorry, I can't help with that request.")

    def test_malformed_json_between_braces(self):
        with pytest.raises(LLMServiceError):
            parse('{"unclosed": "value", }{')

    def test_top_level_array_is_rejected(self):
        """The callers all index by key, so a bare list is not acceptable."""
        with pytest.raises(LLMServiceError):
            parse("[1, 2, 3]")
