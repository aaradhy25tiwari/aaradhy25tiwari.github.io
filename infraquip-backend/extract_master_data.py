import pandas as pd
import json

df = pd.read_excel(r'c:\Users\aarad\Desktop\Project\aaradhy25tiwari.github.io\Equipment Master data Temp.xlsx')
if 'Unnamed: 0' in df.columns:
    df = df.drop(columns=['Unnamed: 0'])

df = df.fillna('')
data = df.to_dict(orient='records')

with open(r'c:\Users\aarad\Desktop\Project\aaradhy25tiwari.github.io\infraquip-backend\master_data.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f"Successfully wrote {len(data)} records to master_data.json")
