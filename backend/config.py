"""Central configuration, loaded from environment / .env file."""
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://readonly_app:readonly@localhost:5433/company",
)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")
MAX_SQL_RETRIES = int(os.getenv("MAX_SQL_RETRIES", "3"))
MAX_ROWS = int(os.getenv("MAX_ROWS", "200"))
