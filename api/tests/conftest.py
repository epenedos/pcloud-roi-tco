import os
import tempfile

# Point the app at a throwaway SQLite DB before any app module is imported.
# (Compose runs PostgreSQL; the schema is portable across both.)
_TEST_DB = os.path.join(tempfile.mkdtemp(prefix="pamroi-test-"), "test.db")
os.environ.setdefault("PAMROI_DATABASE_URL", f"sqlite:///{_TEST_DB}")

import pytest

from app.engine.defaults import default_inputs_dict, workbook_inventory
from app.engine.models import CalcInputs


@pytest.fixture
def workbook_inputs() -> CalcInputs:
    """The reference workbook's exact input set (5,000 passwords, frozen
    workbook inventory — current Mid-Range defaults additionally include PVWA)."""
    inputs = default_inputs_dict(num_passwords=5000)
    inputs["inventory"] = workbook_inventory()
    return CalcInputs(**inputs)


@pytest.fixture(scope="session")
def db_schema():
    from app import models_db  # noqa: F401
    from app.db import Base, engine

    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client(db_schema):
    from fastapi.testclient import TestClient

    from app.main import app

    return TestClient(app)
