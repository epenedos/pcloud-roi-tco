"""Seed demo analyses: the workbook golden case and a Very Large showcase.

Run inside the api container:  python -m app.seed
Idempotent: skips any analysis whose name already exists.
"""
from sqlalchemy import select

from app.db import Base, SessionLocal, engine
from app.engine import ENGINE_VERSION
from app.engine.calc import calculate
from app.engine.defaults import default_inputs_dict
from app.engine.models import CalcInputs
from app.models_db import Analysis, AnalysisVersion


def _seed(session, name: str, customer: str, description: str, inputs: dict):
    if session.scalars(select(Analysis).where(Analysis.name == name)).first():
        print(f"skip (exists): {name}")
        return
    calc_inputs = CalcInputs(**inputs)
    results = calculate(calc_inputs).model_dump(mode="json")
    analysis = Analysis(name=name, customer_name=customer, description=description)
    session.add(analysis)
    session.flush()
    session.add(
        AnalysisVersion(
            analysis_id=analysis.id,
            seq=1,
            inputs=calc_inputs.model_dump(mode="json"),
            results=results,
            engine_version=ENGINE_VERSION,
        )
    )
    print(f"seeded: {name} (net savings €{results['summary']['net_savings']:,.0f})")


def main():
    Base.metadata.create_all(engine)
    session = SessionLocal()
    try:
        _seed(
            session,
            "Demo — Workbook example (Mid-Range)",
            "ACME Industries",
            "Reference case matching the PAM_TCO_ROI.xlsx workbook example: "
            "5,000 passwords, Mid-Range estate, default industry rates.",
            default_inputs_dict(num_passwords=5000),
        )

        very_large = default_inputs_dict(num_passwords=250_000)
        very_large["licensing"].update(
            {"onprem_renewal": 950_000, "saas_subscription": 820_000}
        )
        very_large["ops"].update({"onprem_fte": 4.0, "saas_fte": 1.0})
        very_large["migration"].update(
            {"mig_ps": 180_000, "mig_internal": 90_000, "mig_training": 25_000}
        )
        very_large["connectors"].update({"conn_qty": 6})
        very_large["benefits"]["b6"]["insurance_premium"] = 600_000
        _seed(
            session,
            "Demo — Global bank (Very Large)",
            "Meridian Global Bank",
            "Showcase case: 250,000 passwords, Very Large estate, "
            "enterprise-scale licensing and migration figures.",
            very_large,
        )
        session.commit()
    finally:
        session.close()


if __name__ == "__main__":
    main()
