"""
AICTE FDR Smart Portal: Bank CBS Seed Data Link
File: src/bank-gateway/seed_data.py
"""

import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
fdr_src = os.path.join(BASE_DIR, "src", "fdr-service")
if fdr_src not in sys.path:
    sys.path.insert(0, fdr_src)

try:
    from seed_data import DEMO_CBS_RECORDS, DEMO_INSTITUTIONS, DEMO_FDR_RECORDS
except ImportError:
    DEMO_CBS_RECORDS = {}
    DEMO_INSTITUTIONS = []
    DEMO_FDR_RECORDS = {}
