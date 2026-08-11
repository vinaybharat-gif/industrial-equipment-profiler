import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

# 1. Load Dataset
df = pd.read_csv("ai4i2020.csv")

# 2. Encode Machine Type ('L': 0, 'M': 1, 'H': 2)
type_mapping = {'L': 0, 'M': 1, 'H': 2}
df['Type'] = df['Type'].map(type_mapping)

# 3. Target Consolidation (Multi-class Classification)
def categorize_failure(row):
    if row['TWF'] == 1: return 1
    elif row['HDF'] == 1: return 2
    elif row['PWF'] == 1: return 3
    elif row['OSF'] == 1: return 4
    elif row['RNF'] == 1: return 5
    else: return 0

df['Failure_Type'] = df.apply(categorize_failure, axis=1)

# 4. Feature Selection
features = ['Type', 'Air temperature [K]', 'Process temperature [K]', 
            'Rotational speed [rpm]', 'Torque [Nm]', 'Tool wear [min]']
X = df[features]
y = df['Failure_Type']

# 5. Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 6. Model Training
model = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
model.fit(X_train, y_train)

# 7. Evaluate
y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")

# 8. Save Model
joblib.dump(model, "predictive_model.pkl")
print("Model saved as predictive_model.pkl successfully!")