import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Industrial Predictive Maintenance ML Service", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    model = joblib.load("predictive_model.pkl")
except Exception as e:
    model = None

FAILURE_LABELS = {
    0: "No Failure",
    1: "Tool Wear Failure",
    2: "Heat Dissipation Failure",
    3: "Power Failure",
    4: "Overstrain Failure",
    5: "Random Failure"
}

RECOMMENDATIONS = {
    0: "Machine operating normally.",
    1: "High tool wear detected. Schedule replacement within 24 hours.",
    2: "High thermal profile. Inspect cooling fan and coolant levels.",
    3: "Power anomaly detected. Inspect power supply and motor electrical load.",
    4: "Overstrain detected. Reduce operating torque load.",
    5: "Unusual vibration detected. Perform manual inspection."
}

class SensorDataInput(BaseModel):
    machine_type: str = Field(..., example="M")
    air_temperature: float = Field(..., example=300.0)
    process_temperature: float = Field(..., example=310.0)
    rotational_speed: float = Field(..., example=1500.0)
    torque: float = Field(..., example=40.0)
    tool_wear: float = Field(..., example=100.0)

@app.post("/predict")
def predict_failure(data: SensorDataInput):
    if model is None:
        raise HTTPException(status_code=500, detail="Model artifact not found.")

    type_map = {'L': 0, 'M': 1, 'H': 2}
    m_type = type_map.get(data.machine_type.upper(), 1)

    input_features = np.array([[
        m_type,
        data.air_temperature,
        data.process_temperature,
        data.rotational_speed,
        data.torque,
        data.tool_wear
    ]])

    pred_class = int(model.predict(input_features)[0])
    probabilities = model.predict_proba(input_features)[0]
    
    max_prob = float(np.max(probabilities))
    no_failure_prob = float(probabilities[0])
    health_score = round(no_failure_prob * 100, 2)

    return {
        "failure_type": FAILURE_LABELS.get(pred_class, "Unknown Failure"),
        "probability": round(max_prob * 100, 2),
        "health_score": health_score,
        "is_at_risk": pred_class != 0 or health_score < 70.0,
        "recommendation": RECOMMENDATIONS.get(pred_class, "Perform general inspection.")
    }