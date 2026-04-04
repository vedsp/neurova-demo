from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "CognitiveRehab"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    DATABASE_URL: str = "sqlite:///./cognitive_rehab.db"
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500"

    @property
    def origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
