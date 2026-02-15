"""Fernet encryption for storing API keys at rest."""

from cryptography.fernet import Fernet

from app.config import settings

_cipher = Fernet(settings.encryption_key.encode())


def encrypt_api_key(plaintext: str) -> str:
    return _cipher.encrypt(plaintext.encode()).decode()


def decrypt_api_key(ciphertext: str) -> str:
    return _cipher.decrypt(ciphertext.encode()).decode()


def key_preview(plaintext: str) -> str:
    """Return first 4 + last 4 chars with **** in between."""
    if len(plaintext) <= 8:
        return "****"
    return f"{plaintext[:4]}...{plaintext[-4:]}"
