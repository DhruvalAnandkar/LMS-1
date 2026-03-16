from typing import Optional

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Lumina"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql://lms:lms_password@localhost:5432/lms_db"

    # JWT
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --------------- AI Provider Toggle ---------------
    AI_PROVIDER: str = "azure"  # "azure" or "google"

    # Azure OpenAI
    AZURE_OPENAI_KEY: Optional[str] = ""
    AZURE_OPENAI_ENDPOINT: Optional[str] = ""
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4o-mini"
    AZURE_OPENAI_API_VERSION: str = "2024-02-15-preview"

    # Google AI
    GOOGLE_API_KEY: Optional[str] = ""
    GOOGLE_AI_MODEL: str = "gemini-2.0-flash"

    # --------------- Storage Toggle ---------------
    USE_LOCAL_STORAGE: bool = False
    LOCAL_STORAGE_PATH: str = "./uploads"

    # Azure Blob Storage
    AZURE_STORAGE_CONNECTION_STRING: Optional[str] = ""
    AZURE_STORAGE_ACCOUNT_NAME: Optional[str] = ""
    AZURE_STORAGE_ACCOUNT_KEY: Optional[str] = ""
    AZURE_STORAGE_DOCUMENTS_CONTAINER: str = "lms-documents"
    AZURE_STORAGE_SUBMISSIONS_CONTAINER: str = "lms-submissions"
    AZURE_STORAGE_USE_SAS: bool = True
    AZURE_STORAGE_SAS_EXPIRY_MINUTES: int = 60

    # Pinecone
    PINECONE_API_KEY: Optional[str] = ""
    PINECONE_ENVIRONMENT: str = "us-east-1"
    PINECONE_INDEX_NAME: str = "lms-course-content"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Upload limits (MB)
    MAX_UPLOAD_MB: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
