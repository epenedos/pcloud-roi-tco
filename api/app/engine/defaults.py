"""Defaults registry: workbook example values + t-shirt inventory matrix.

Ships as versioned JSON so field engineers can tune defaults without touching
engine code (ROADMAP architecture decision).
"""
import json
from functools import lru_cache
from pathlib import Path

_DEFAULTS_PATH = Path(__file__).parent / "defaults.json"

_REQUIRED_TOP_KEYS = {"schema_version", "inputs", "tshirt_inventories"}
_REQUIRED_SIZES = {"SMALL", "MID_RANGE", "LARGE", "VERY_LARGE"}


@lru_cache(maxsize=1)
def load_defaults() -> dict:
    data = json.loads(_DEFAULTS_PATH.read_text())
    missing = _REQUIRED_TOP_KEYS - data.keys()
    if missing:
        raise ValueError(f"defaults.json missing keys: {missing}")
    missing_sizes = _REQUIRED_SIZES - data["tshirt_inventories"].keys()
    if missing_sizes:
        raise ValueError(f"defaults.json missing t-shirt sizes: {missing_sizes}")
    return data


def default_inputs_dict(num_passwords: int | None = None) -> dict:
    """Full default input set; inventory seeded from the (derived) t-shirt size."""
    from app.engine.sizing import size_for  # local import to avoid cycle

    data = load_defaults()
    inputs = json.loads(json.dumps(data["inputs"]))  # deep copy
    if num_passwords is not None:
        inputs["num_passwords"] = num_passwords
    size = size_for(inputs["num_passwords"])
    inputs["inventory"] = default_inventory_for(size.value)
    return inputs


def default_inventory_for(size_key: str) -> list[dict]:
    data = load_defaults()
    return json.loads(json.dumps(data["tshirt_inventories"][size_key]))


def workbook_inventory() -> list[dict]:
    """The reference workbook's component inventory, frozen for golden parity
    and the workbook demo. Excludes components added later (e.g. PVWA)."""
    data = load_defaults()
    return json.loads(json.dumps(data["workbook_inventory"]))
