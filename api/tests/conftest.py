import pytest

from app.engine.defaults import default_inputs_dict
from app.engine.models import CalcInputs


@pytest.fixture
def workbook_inputs() -> CalcInputs:
    """Workbook example input set (Mid-Range, 5,000 passwords)."""
    return CalcInputs(**default_inputs_dict(num_passwords=5000))
