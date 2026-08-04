"""Full analysis lifecycle: create → edit → duplicate → soft-delete → restore."""


def test_full_lifecycle(client):
    # create
    resp = client.post(
        "/api/analyses",
        json={"name": "ACME Corp", "customer_name": "ACME", "num_passwords": 5000},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    aid = body["id"]
    assert body["version_seq"] == 1
    assert body["results"]["tshirt_size"] == "MID_RANGE"
    assert round(body["results"]["summary"]["net_savings"]) == 530437  # incl. PVWA

    # duplicate name rejected
    resp = client.post("/api/analyses", json={"name": "ACME Corp"})
    assert resp.status_code == 409

    # list with headline
    listing = client.get("/api/analyses").json()
    assert len([a for a in listing if a["id"] == aid]) == 1
    entry = next(a for a in listing if a["id"] == aid)
    assert round(entry["headline"]["net_savings"]) == 530437
    assert entry["headline"]["tshirt_size"] == "MID_RANGE"

    # edit inputs -> new version, recalculated
    inputs = body["inputs"]
    inputs["licensing"]["saas_subscription"] = 140000
    resp = client.put(f"/api/analyses/{aid}/inputs", json=inputs)
    assert resp.status_code == 200
    v2 = resp.json()
    assert v2["version_seq"] == 2
    assert v2["results"]["summary"]["net_savings"] > 530437

    # version history kept
    versions = client.get(f"/api/analyses/{aid}/versions").json()
    assert [v["seq"] for v in versions] == [1, 2]
    v1 = client.get(
        f"/api/analyses/{aid}/versions/{versions[0]['version_id']}"
    ).json()
    assert round(v1["results"]["summary"]["net_savings"]) == 530437

    # rename
    resp = client.patch(f"/api/analyses/{aid}", json={"name": "ACME Corp 2026"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "ACME Corp 2026"

    # duplicate
    resp = client.post(
        f"/api/analyses/{aid}/duplicate", json={"name": "ACME what-if"}
    )
    assert resp.status_code == 201
    dup = resp.json()
    assert dup["id"] != aid
    assert dup["version_seq"] == 1
    assert dup["inputs"]["licensing"]["saas_subscription"] == 140000

    # soft delete + restore
    assert client.delete(f"/api/analyses/{aid}").json()["deleted"] is True
    assert client.get(f"/api/analyses/{aid}").status_code == 404
    ids = [a["id"] for a in client.get("/api/analyses").json()]
    assert aid not in ids
    ids = [
        a["id"]
        for a in client.get("/api/analyses", params={"include_deleted": True}).json()
    ]
    assert aid in ids
    resp = client.post(f"/api/analyses/{aid}/restore")
    assert resp.status_code == 200
    assert client.get(f"/api/analyses/{aid}").status_code == 200


def test_create_seeds_tshirt_inventory(client):
    resp = client.post(
        "/api/analyses", json={"name": "Big bank", "num_passwords": 250000}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["results"]["tshirt_size"] == "VERY_LARGE"
    psm = next(r for r in body["inputs"]["inventory"] if r["name"] == "PSM")
    assert psm["qty"] == 10


def test_unknown_analysis_404(client):
    assert client.get("/api/analyses/nope").status_code == 404
    assert client.delete("/api/analyses/nope").status_code == 404
