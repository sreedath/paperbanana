"""JWT authentication dependency for FastAPI."""

from fastapi import Header, HTTPException, status
from jose import JWTError, jwt

from app.config import settings


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Validate the Supabase JWT and extract user info.

    The frontend sends: Authorization: Bearer <supabase-access-token>
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token format")

    token = authorization[7:]  # strip "Bearer "
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing user ID")

    return {"user_id": user_id, "email": payload.get("email", "")}
