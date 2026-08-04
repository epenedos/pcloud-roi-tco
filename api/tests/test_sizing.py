import pytest

from app.engine.models import TShirtSize
from app.engine.sizing import default_inventory, size_for


@pytest.mark.parametrize(
    ("num_passwords", "expected"),
    [
        (1, TShirtSize.SMALL),
        (999, TShirtSize.SMALL),
        (1_000, TShirtSize.MID_RANGE),
        (5_000, TShirtSize.MID_RANGE),
        (20_000, TShirtSize.MID_RANGE),
        (20_001, TShirtSize.LARGE),
        (100_000, TShirtSize.LARGE),
        (100_001, TShirtSize.VERY_LARGE),
        (1_000_000, TShirtSize.VERY_LARGE),
    ],
)
def test_size_boundaries(num_passwords, expected):
    assert size_for(num_passwords) == expected


def test_mid_range_inventory_matches_workbook():
    inv = {r.name: r for r in default_inventory(TShirtSize.MID_RANGE)}
    assert inv["Vault (Primary Cluster)"].qty == 2
    assert inv["Vault DR"].qty == 1
    assert inv["CPM"].qty == 2
    assert inv["PSM"].qty == 3
    assert inv["PSMP"].qty == 2
    assert inv["PTA"].qty == 1
    assert inv["PSM"].vcpu_each == 8
    assert inv["PSM"].ram_gb_each == 16
    assert inv["PSM"].storage_gb_each == 250
    assert inv["PTA"].os == "Linux"


def test_all_sizes_have_full_inventory():
    for size in TShirtSize:
        inv = default_inventory(size)
        assert len(inv) == 7
        names = {r.name for r in inv}
        assert "Vault (Primary Cluster)" in names
        assert "PSM" in names
        assert "PVWA" in names


@pytest.mark.parametrize(
    ("size", "qty", "vcpu", "ram"),
    [
        (TShirtSize.SMALL, 1, 4, 8),
        (TShirtSize.MID_RANGE, 2, 8, 16),
        (TShirtSize.LARGE, 3, 16, 32),
        (TShirtSize.VERY_LARGE, 4, 32, 64),
    ],
)
def test_pvwa_specs_per_size(size, qty, vcpu, ram):
    pvwa = next(r for r in default_inventory(size) if r.name == "PVWA")
    assert pvwa.qty == qty
    assert pvwa.vcpu_each == vcpu
    assert pvwa.ram_gb_each == ram
    assert pvwa.storage_gb_each == 160
    assert pvwa.os == "Windows"
    assert pvwa.role == "Privileged Web Access"


def test_sizes_scale_up():
    def capacity(size):
        return sum(r.qty * r.vcpu_each for r in default_inventory(size))

    caps = [capacity(s) for s in
            (TShirtSize.SMALL, TShirtSize.MID_RANGE, TShirtSize.LARGE, TShirtSize.VERY_LARGE)]
    assert caps == sorted(caps)
    assert caps[0] < caps[-1]
