"""
Authentication: password hashing and JWT issue/decode behaviour.
"""

from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    create_admin_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_the_plaintext(self):
        hashed = hash_password("s3cret-password")
        assert hashed != "s3cret-password"
        assert "s3cret-password" not in hashed

    def test_correct_password_verifies(self):
        assert verify_password("s3cret-password", hash_password("s3cret-password"))

    def test_wrong_password_rejected(self):
        assert not verify_password("wrong-password", hash_password("s3cret-password"))

    def test_same_password_hashes_differently(self):
        """Distinct salts — two hashes of one password must not be identical."""
        assert hash_password("same-password") != hash_password("same-password")


class TestAccessToken:
    def test_round_trip_carries_subject(self):
        user_id = str(uuid.uuid4())
        payload = decode_access_token(create_access_token(subject=user_id))
        assert payload["sub"] == user_id

    def test_expired_token_is_rejected(self):
        token = create_access_token(
            subject=str(uuid.uuid4()), expires_delta=timedelta(seconds=-30)
        )
        with pytest.raises(JWTError):
            decode_access_token(token)

    def test_tampered_signature_is_rejected(self):
        token = create_access_token(subject=str(uuid.uuid4()))
        header, payload, signature = token.split(".")
        forged = f"{header}.{payload}.{signature[:-4]}XXXX"
        with pytest.raises(JWTError):
            decode_access_token(forged)

    def test_garbage_token_is_rejected(self):
        with pytest.raises(JWTError):
            decode_access_token("not-a-jwt")


class TestAdminTokenScope:
    """Admin and user tokens must not be interchangeable."""

    def test_admin_token_carries_admin_scope(self):
        payload = decode_access_token(create_admin_token(subject=str(uuid.uuid4())))
        assert payload.get("scope") == "admin"

    def test_user_token_has_no_admin_scope(self):
        payload = decode_access_token(create_access_token(subject=str(uuid.uuid4())))
        assert payload.get("scope") != "admin"
