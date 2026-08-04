from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_defaults_endpoint():
    resp = client.get("/api/defaults", params={"num_passwords": 150000})
    assert resp.status_code == 200
    body = resp.json()
    assert body["tshirt_size"] == "VERY_LARGE"
    assert body["inputs"]["num_passwords"] == 150000
    assert len(body["inputs"]["inventory"]) == 7


def test_inventory_for_size_endpoint():
    resp = client.get("/api/defaults/inventory/LARGE")
    assert resp.status_code == 200
    assert resp.json()["size"] == "LARGE"


def test_preview_endpoint_golden():
    # Mid-Range defaults incl. PVWA: workbook €515,593 + PVWA €4,948 × 3 years
    inputs = client.get("/api/defaults", params={"num_passwords": 5000}).json()["inputs"]
    resp = client.post("/api/calc/preview", json=inputs)
    assert resp.status_code == 200
    body = resp.json()
    assert round(body["summary"]["net_savings"]) == 530437
    assert body["tshirt_size"] == "MID_RANGE"
    assert body["engine_version"] == "1.0"


def test_preview_rejects_bad_input():
    inputs = client.get("/api/defaults").json()["inputs"]
    inputs["params"]["horizon"] = 0
    resp = client.post("/api/calc/preview", json=inputs)
    assert resp.status_code == 422
