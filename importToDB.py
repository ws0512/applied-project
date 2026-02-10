import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# ---------- CONFIG ----------
EXCEL_FILE = "CrimeSpreadsheet.xlsx"
ADDED_BY = 1

DB_CONFIG = {
    "host": "localhost",
    "dbname": "main",
    "user": "postgres",
    "password": "toor",
    "port": 5432,
}
# ----------------------------

# Load Excel
df = pd.read_excel(EXCEL_FILE)

# Rename columns to match DB meaning
df = df.rename(columns={
    "Month": "date",
    "Reported by": "reported_by",
    "Longitude": "longitude",
    "Latitude": "latitude",
    "Location": "location",
    "Crime type": "crime_type",
})

# Convert YYYY-MM → YYYY-MM-01
df["date"] = pd.to_datetime(df["date"], format="%Y-%m").dt.date

# Add added_by column
df["added_by"] = ADDED_BY

# Optional: drop rows with bad coordinates
df = df[
    (df["latitude"].between(-90, 90)) &
    (df["longitude"].between(-180, 180))
]

# Prepare data for insert
records = df[[
    "date",
    "latitude",
    "longitude",
    "reported_by",
    "location",
    "crime_type",
    "added_by",
]].values.tolist()

# Insert into PostgreSQL
conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

sql = """
INSERT INTO public."Crime"
(date, latitude, longitude, reported_by, location, crime_type, added_by)
VALUES %s
"""

execute_values(cur, sql, records)

conn.commit()
cur.close()
conn.close()

print(f"Imported {len(records)} rows successfully.")
