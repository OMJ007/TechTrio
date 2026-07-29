"""Unit tests for password security and JWT helper functions."""

import unittest
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestSecurity(unittest.TestCase):
    def test_password_hashing(self):
        raw_password = "mySecretPassword123!"
        hashed = hash_password(raw_password)
        self.assertNotEqual(hashed, raw_password)
        self.assertTrue(verify_password(raw_password, hashed))
        self.assertFalse(verify_password("wrongPassword", hashed))

    def test_jwt_token_encode_decode(self):
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        token = create_access_token(data={"sub": user_id})
        self.assertIsInstance(token, str)

        payload = decode_access_token(token)
        self.assertEqual(payload.get("sub"), user_id)


if __name__ == "__main__":
    unittest.main()
