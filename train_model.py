import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from supabase import create_client, Client
import os

# 1. Load AI4I 2020 Dataset
print("1. Loading AI4I 2020 Dataset...")
df = pd.read_csv('ai4i2020.csv')

# 2. Extract Sensor Features & Target
feature_cols = [
    'Air temperature [K]', 
    'Process temperature [K]', 
    'Rotational speed [rpm]', 
    'Torque [Nm]', 
    'Tool wear [min]'
]

X = df[feature_cols]
y = df['Machine failure']

# 3. Train Random Forest Model
print("2. Training Random Forest Classifier...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

accuracy = model.score(X_test, y_test) * 100
print(f"✅ Model Trained Successfully! Accuracy: {accuracy:.2f}%\n")

# 4. Predict Failure Probabilities & Generate Statuses
df['failure_prob'] = model.predict_proba(X)[:, 1]

def determine_status(prob):
    if prob >= 0.7:
        return 'CRITICAL'
    elif prob >= 0.3:
        return 'WARNING'
    else:
        return 'HEALTHY'

df['status'] = df['failure_prob'].apply(determine_status)
df['health_score'] = ((1 - df['failure_prob']) * 100).round(1)

# 5. Connect via Supabase REST API & Bulk Upload All 10,000 Records
SUPABASE_URL = "https://jdkduznbbwdcftyuqvod.supabase.co"
supabase_key = os.getenv("SUPABASE_KEY", "")

print("3. Connecting to Supabase API...")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Format all 10,000 records
    print("Preparing 10,000 records for database insertion...")
    all_records = []
    
    for index, row in df.iterrows():
        all_records.append({
            "id": f"MCH-{row['UDI']}",
            "name": f"CNC {row['Type']}-Class Machine (ID: {row['Product ID']})",
            "type": f"Class {row['Type']}",
            "location": "Plant A" if index % 2 == 0 else "Plant B",
            "status": row['status'],
            "health_score": float(row['health_score']),
            "machine_code": f"MCH-{row['UDI']}"
        })

    # Upload in batches of 1,000 rows for high performance
    batch_size = 1000
    total_records = len(all_records)
    
    print(f"Uploading {total_records} records in batches of {batch_size}...")
    
    for i in range(0, total_records, batch_size):
        batch = all_records[i : i + batch_size]
        supabase.from_('machines').upsert(batch).execute()
        print(f"  Uploaded records {i + 1} to {min(i + batch_size, total_records)}...")

    print("\n✅ Successfully stored all 10,000 ML predictions into Supabase!")

except Exception as e:
    print(f"❌ Supabase Connection Error: {e}")