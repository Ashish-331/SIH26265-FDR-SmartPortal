import os
import re
import yaml

BASE_DIR = os.path.abspath("C:/Users/Hp/SIH26265-FDR-SmartPortal")

def check_sql_enums():
    sql_path = os.path.join(BASE_DIR, "docs", "04_DATABASE_SCHEMA_AND_MODELS.sql")
    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()
    
    enums = re.findall(r"CREATE\s+TYPE\s+(\w+)\s+AS\s+ENUM\s*\(([\s\S]*?)\);", sql, re.IGNORECASE)
    enum_dict = {}
    for name, body in enums:
        vals = [v.strip().strip("'\"") for v in body.split(",") if v.strip()]
        enum_dict[name] = vals
    return enum_dict

def check_state_machine():
    sm_path = os.path.join(BASE_DIR, "docs", "03_LOW_LEVEL_DESIGN_AND_STATE_MACHINES.md")
    with open(sm_path, "r", encoding="utf-8") as f:
        sm = f.read()
    return sm

def check_api_paths():
    api_path = os.path.join(BASE_DIR, "docs", "05_API_SPECIFICATION.yaml")
    with open(api_path, "r", encoding="utf-8") as f:
        spec = yaml.safe_load(f)
    return list(spec.get("paths", {}).keys())

def check_code_routes():
    routes = {}
    services = ["fdr-service", "bank-gateway", "ocr-service", "audit-service"]
    for s in services:
        p = os.path.join(BASE_DIR, "src", s, "main.py")
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                content = f.read()
            endpoints = re.findall(r'@app\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']', content)
            routes[s] = endpoints
    return routes

if __name__ == "__main__":
    print("=== SQL ENUMS ===")
    enums = check_sql_enums()
    for k, v in enums.items():
        print(f"{k}: {v}")
    
    print("\n=== API PATHS (OpenAPI) ===")
    api_paths = check_api_paths()
    for p in api_paths:
        print(f"  {p}")

    print("\n=== CODE IMPLEMENTED ROUTES ===")
    code_routes = check_code_routes()
    for svc, eps in code_routes.items():
        print(f"[{svc}]")
        for m, u in eps:
            print(f"  {m.upper()} {u}")
