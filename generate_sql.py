import pandas as pd
import math

df = pd.read_excel('Andhra_Pradesh_Hierarchy_Dataset.xlsx', skiprows=2)

sql_statements = []

# Mapping from name to ID
countries = {}
states = {}
districts = {}
constituencies = {}
mandals = {}
panchayats = {}
villages = {}

# IDs
cid = 1
sid = 1
did = 1
con_id = 1
mid = 1
pid = 1
vid = 1

for idx, row in df.iterrows():
    if pd.isna(row['Country']):
        continue

    c_name = str(row['Country']).strip()
    s_name = str(row['State']).strip()
    d_name = str(row['District']).strip()
    m_name = str(row['Mandal (Sub-District)']).strip()
    v_name = str(row['Village']).strip()
    
    if c_name not in countries:
        countries[c_name] = cid
        sql_statements.append(f"INSERT INTO country (id, name) VALUES ({cid}, '{c_name.replace(chr(39), chr(39)+chr(39))}');")
        cid += 1
        
    if s_name not in states:
        states[s_name] = sid
        sql_statements.append(f"INSERT INTO state (id, name, country_id) VALUES ({sid}, '{s_name.replace(chr(39), chr(39)+chr(39))}', {countries[c_name]});")
        sid += 1
        
    if d_name not in districts:
        districts[d_name] = did
        sql_statements.append(f"INSERT INTO district (id, name, state_id) VALUES ({did}, '{d_name.replace(chr(39), chr(39)+chr(39))}', {states[s_name]});")
        # Generate dummy constituency
        con_name = f"Default Constituency {d_name}"
        constituencies[con_name] = con_id
        sql_statements.append(f"INSERT INTO constituency (id, name, district_id, mla_name, mp_name) VALUES ({con_id}, '{con_name}', {did}, 'Pending MLA', 'Pending MP');")
        con_id += 1
        did += 1
        
    con_name_for_mandal = f"Default Constituency {d_name}"
        
    if m_name not in mandals:
        mandals[m_name] = mid
        sql_statements.append(f"INSERT INTO mandal (id, name, constituency_id) VALUES ({mid}, '{m_name.replace(chr(39), chr(39)+chr(39))}', {constituencies[con_name_for_mandal]});")
        # Generate dummy panchayat
        pan_name = f"Default Panchayat {m_name}"
        panchayats[pan_name] = pid
        sql_statements.append(f"INSERT INTO panchayat (id, name, mandal_id) VALUES ({pid}, '{pan_name.replace(chr(39), chr(39)+chr(39))}', {mid});")
        pid += 1
        mid += 1
        
    pan_name_for_village = f"Default Panchayat {m_name}"
    
    v_key = f"{m_name}-{v_name}"
    if v_key not in villages:
        villages[v_key] = vid
        sql_statements.append(f"INSERT INTO village (id, name, panchayat_id) VALUES ({vid}, '{v_name.replace(chr(39), chr(39)+chr(39))}', {panchayats[pan_name_for_village]});")
        vid += 1

# Add sample users
sql_statements.append("INSERT INTO users (id, username, password_hash, role, full_name, phone) VALUES (1, 'admin', 'password', 'ADMIN', 'Admin User', '1234567890');")
sql_statements.append("INSERT INTO users (id, username, password_hash, role, full_name, phone) VALUES (2, 'Nodal-101', 'password', 'NODAL_OFFICER', 'Nodal Officer 1', '1234567890');")
sql_statements.append("INSERT INTO users (id, username, password_hash, role, full_name, phone) VALUES (3, 'VOL-101', 'password', 'VOLUNTEER', 'Volunteer 1', '1234567890');")


with open('backend/src/main/resources/data.sql', 'w', encoding='utf-8') as f:
    for stmt in sql_statements:
        f.write(stmt + "\n")

print(f"Generated data.sql with {len(sql_statements)} statements.")
