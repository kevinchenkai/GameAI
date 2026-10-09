"""Shared paths: public runtime, reviewed source facts, docs and ignored caches."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SOURCES = ROOT / "data" / "sources"
DOCS = ROOT / "docs"
CACHE = ROOT / ".cache"
