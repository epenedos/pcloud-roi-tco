from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://pamroi:pamroi@db:5432/pamroi"
    web_base_url: str = "http://web:80"
    chromium_path: str = ""  # empty = Playwright's own managed Chromium

    model_config = {"env_prefix": "PAMROI_"}


settings = Settings()
