from fastapi import APIRouter

from app.engine.calc import calculate
from app.engine.defaults import default_inputs_dict, default_inventory_for
from app.engine.models import CalcInputs, CalcResult, TShirtSize
from app.engine.sizing import size_for

router = APIRouter(prefix="/api", tags=["calc"])


@router.post("/calc/preview", response_model=CalcResult)
def preview(inputs: CalcInputs) -> CalcResult:
    """Stateless calculation: full input set in, full result set out."""
    return calculate(inputs)


@router.get("/defaults")
def defaults(num_passwords: int = 5000):
    """Default input set, inventory seeded from the derived t-shirt size."""
    return {
        "tshirt_size": size_for(num_passwords).value,
        "inputs": default_inputs_dict(num_passwords=num_passwords),
    }


@router.get("/defaults/inventory/{size}")
def inventory_for_size(size: TShirtSize):
    return {"size": size.value, "inventory": default_inventory_for(size.value)}
