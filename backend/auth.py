"""
Auth JWT-like (HMAC-SHA256) + PBKDF2 password — pure stdlib, no extra deps.
Roles: expert | parent | admin
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_DEFAULT_JWT = "zpd-care-dev-secret-change-me"
SECRET_KEY = os.environ.get("JWT_SECRET", _DEFAULT_JWT)
TOKEN_TTL_SECONDS = int(os.environ.get("JWT_TTL_SECONDS", str(60 * 60 * 12)))  # 12h
_security = HTTPBearer(auto_error=False)

# Demo mode: if AUTH_DISABLED=1, APIs stay open (legacy)
AUTH_DISABLED = os.environ.get("AUTH_DISABLED", "0").strip() in ("1", "true", "True", "yes")

if SECRET_KEY == _DEFAULT_JWT:
    print("[ZPD AUTH WARNING] JWT_SECRET is default. Set a strong JWT_SECRET in .env for production.")
if AUTH_DISABLED:
    print("[ZPD AUTH WARNING] AUTH_DISABLED=1 - API open without login.")


def hash_password(password: str, salt: Optional[str] = None) -> str:
    if salt is None:
        salt = base64.urlsafe_b64encode(os.urandom(16)).decode("ascii").rstrip("=")
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"pbkdf2_sha256${salt}${base64.urlsafe_b64encode(dk).decode('ascii')}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt, digest = stored.split("$", 2)
        if algo != "pbkdf2_sha256":
            return False
        candidate = hash_password(password, salt=salt)
        return hmac.compare_digest(candidate, stored)
    except Exception:
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def create_access_token(payload: Dict[str, Any], expires_seconds: int = TOKEN_TTL_SECONDS) -> str:
    body = dict(payload)
    body["exp"] = int(time.time()) + expires_seconds
    body["iat"] = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    h = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p = _b64url_encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h}.{p}".encode("ascii")
    sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{h}.{p}.{_b64url_encode(sig)}"


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        h, p, s = token.split(".")
        signing_input = f"{h}.{p}".encode("ascii")
        expected = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(_b64url_encode(expected), s):
            raise HTTPException(status_code=401, detail="Token không hợp lệ")
        payload = json.loads(_b64url_decode(p).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise HTTPException(status_code=401, detail="Token đã hết hạn")
        return payload
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> Dict[str, Any]:
    if AUTH_DISABLED:
        return {
            "sub": "demo",
            "role": "expert",
            "full_name": "Demo Expert",
            "student_id": None,
            "auth_disabled": True,
        }
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Thiếu token đăng nhập")
    payload = decode_access_token(credentials.credentials)
    return {
        "sub": payload.get("sub"),
        "role": payload.get("role"),
        "full_name": payload.get("full_name"),
        "student_id": payload.get("student_id"),
        "auth_disabled": False,
    }


def require_roles(*roles: str):
    def _dep(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user.get("auth_disabled"):
            return user
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Không đủ quyền truy cập")
        return user

    return _dep


def assert_student_access(user: Dict[str, Any], student_id: int) -> None:
    """Expert/admin: all students. Parent: only linked student_id."""
    if user.get("auth_disabled"):
        return
    role = user.get("role")
    if role in ("expert", "admin"):
        return
    if role == "parent":
        linked = user.get("student_id")
        if linked is None or int(linked) != int(student_id):
            raise HTTPException(status_code=403, detail="Phụ huynh chỉ xem được hồ sơ con mình")
        return
    raise HTTPException(status_code=403, detail="Không đủ quyền")
