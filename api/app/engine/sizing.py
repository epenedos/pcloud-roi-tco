"""T-shirt sizing from number of passwords (CALC-SPEC §A2)."""
from app.engine.defaults import default_inventory_for
from app.engine.models import ComponentRow, TShirtSize


def size_for(num_passwords: int) -> TShirtSize:
    if num_passwords < 1_000:
        return TShirtSize.SMALL
    if num_passwords <= 20_000:
        return TShirtSize.MID_RANGE
    if num_passwords <= 100_000:
        return TShirtSize.LARGE
    return TShirtSize.VERY_LARGE


def default_inventory(size: TShirtSize) -> list[ComponentRow]:
    return [ComponentRow(**row) for row in default_inventory_for(size.value)]
