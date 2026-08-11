import pandas as pd

try:
    # Load dataset
    df = pd.read_csv('ai4i2020.csv')

    print("\n✅ SUCCESS: Dataset loaded successfully!\n")
    print(f"Total Rows: {df.shape[0]} | Total Columns: {df.shape[1]}\n")
    print("--- First 3 Rows Preview ---")
    print(df[['UDI', 'Product ID', 'Type', 'Air temperature [K]', 'Torque [Nm]', 'Machine failure']].head(3))

except FileNotFoundError:
    print("\n❌ ERROR: Could not find 'ai4i2020.csv'.")