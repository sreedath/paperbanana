"""FastAPI application factory for the Paper Banana web backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import assets, gallery, generation, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown logic."""
    yield


app = FastAPI(title="Paper Banana API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(generation.router, prefix="/api/v1", tags=["generation"])
app.include_router(gallery.router, prefix="/api/v1", tags=["gallery"])
app.include_router(assets.router, prefix="/api/v1", tags=["assets"])
