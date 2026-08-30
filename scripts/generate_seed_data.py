"""
generate_seed_data.py
Generates 12 months of realistic synthetic CSVs for the KPI engine:
  - data/seed/sales_daily.csv        (grain: daily, by product & region)
  - data/seed/marketing_weekly.csv   (grain: weekly, by channel)
  - data/seed/financials_monthly.csv (grain: monthly, P&L + events)

Month 10 deliberate multi-driver revenue drop:
  - Volume down 22% (West region supply disruption)
  - Avg price down 7% (aggressive discount campaign)
  - Channel mix shift: 18% more sessions go Online in West
"""

import csv, random, os
from datetime import date, timedelta

random.seed(42)

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'seed')
os.makedirs(BASE_DIR, exist_ok=True)

START_DATE = date(2025, 1, 1)
END_DATE   = date(2025, 12, 31)

REGIONS  = ['North', 'South', 'East', 'West']
PRODUCTS = [
    {'id': 'P001', 'name': 'Analytics Suite',    'base_price': 499.0,  'is_new': False},
    {'id': 'P002', 'name': 'Dashboard Pro',       'base_price': 299.0,  'is_new': False},
    {'id': 'P003', 'name': 'Data Connector Plus', 'base_price': 149.0,  'is_new': False},
    {'id': 'P004', 'name': 'AI Insights Module',  'base_price': 799.0,  'is_new': True},
]
CHANNELS = ['Online', 'Offline', 'Partner']

DROP_MONTH = 10
SEASONALITY = {
    1:0.85, 2:0.88, 3:0.95, 4:1.00,
    5:1.05, 6:1.08, 7:1.03, 8:1.07,
    9:1.10, 10:0.82, 11:1.15, 12:1.20
}

def noise(pct=0.05):
    return 1.0 + random.uniform(-pct, pct)

def date_range(start, end):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)

# ── 1. Sales Daily ──────────────────────────────────────────────────────────
print("Generating sales_daily.csv ...")
sales_rows = []
row_id = 1
for d in date_range(START_DATE, END_DATE):
    month   = d.month
    season  = SEASONALITY[month]
    for region in REGIONS:
        for product in PRODUCTS:
            if product['is_new'] and d < date(2025, 8, 1):
                continue
            base_units = {'P001':12,'P002':18,'P003':28,'P004':4}[product['id']]
            vol_factor = 0.78 if (region == 'West' and month == DROP_MONTH) else 1.0
            weekend_factor = 0.65 if d.weekday() >= 5 else 1.0
            units = max(0, int(base_units * season * vol_factor * weekend_factor * noise(0.12)))
            price_factor = 0.93 if month == DROP_MONTH else 1.0
            price = round(product['base_price'] * price_factor * noise(0.03), 2)
            if month == DROP_MONTH:
                ch_w = [0.60,0.25,0.15] if region=='West' else [0.48,0.35,0.17]
            else:
                ch_w = [0.42,0.42,0.16]
            channel = random.choices(CHANNELS, weights=ch_w, k=1)[0]
            sessions = max(units * random.randint(8,14), 10)
            cogs = round(price * random.uniform(0.38,0.48), 2)
            sales_rows.append({
                'sale_id':        row_id,
                'date':           d.isoformat(),
                'year':           d.year,
                'month':          d.month,
                'week':           d.isocalendar()[1],
                'product_id':     product['id'],
                'product_name':   product['name'],
                'is_new_product': 1 if product['is_new'] else 0,
                'region':         region,
                'channel':        channel,
                'units_sold':     units,
                'unit_price':     price,
                'revenue':        round(units * price, 2),
                'cogs':           round(units * cogs, 2),
                'gross_profit':   round(units * (price - cogs), 2),
                'sessions':       sessions,
                'new_customers':  max(0, int(units * random.uniform(0.18,0.28))),
            })
            row_id += 1

with open(os.path.join(BASE_DIR, 'sales_daily.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=sales_rows[0].keys())
    w.writeheader(); w.writerows(sales_rows)
print(f"  -> {len(sales_rows)} rows")

# ── 2. Marketing Weekly ──────────────────────────────────────────────────────
print("Generating marketing_weekly.csv ...")
mkt_rows = []
week_start = START_DATE
while week_start <= END_DATE:
    week_end = min(week_start + timedelta(days=6), END_DATE)
    year, week_num, _ = week_start.isocalendar()
    month = week_start.month
    season = SEASONALITY[month]
    for channel in CHANNELS:
        base_spend = {'Online':18000,'Offline':12000,'Partner':6000}[channel]
        if month == DROP_MONTH and channel == 'Online':
            sf = 1.45
        elif month == DROP_MONTH and channel == 'Offline':
            sf = 0.70
        else:
            sf = season
        spend = round(base_spend * sf * noise(0.08), 2)
        impressions = int(spend * random.uniform(85,120))
        clicks = int(impressions * random.uniform(0.018,0.035))
        mkt_rows.append({
            'week_start':  week_start.isoformat(),
            'week_end':    week_end.isoformat(),
            'year':        year,
            'week_num':    week_num,
            'month':       month,
            'channel':     channel,
            'spend_usd':   spend,
            'impressions': impressions,
            'clicks':      clicks,
            'ctr_pct':     round(clicks/impressions*100, 3) if impressions > 0 else 0,
        })
    week_start += timedelta(days=7)

with open(os.path.join(BASE_DIR, 'marketing_weekly.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=mkt_rows[0].keys())
    w.writeheader(); w.writerows(mkt_rows)
print(f"  -> {len(mkt_rows)} rows")

# ── 3. Financials Monthly ────────────────────────────────────────────────────
print("Generating financials_monthly.csv ...")
fin_rows = []
for month in range(1, 13):
    season = SEASONALITY[month]
    base_rev = 2_800_000 * season
    if month == DROP_MONTH:
        base_rev *= 0.917
    opex  = round(base_rev * random.uniform(0.28,0.32), 2)
    ebitda = round(base_rev * random.uniform(0.22,0.28) * (0.88 if month==DROP_MONTH else 1.0), 2)
    events = {
        3:  'Q1 product refresh launched',
        6:  'Competitor price cut (Analytics category -12%)',
        9:  'Enterprise sales campaign started',
        10: 'West region supply disruption (weeks 1-3); Discount campaign overshoot; Channel mix shifted to Online',
        11: 'Holiday pre-season promotions started',
        12: 'Year-end enterprise deals; Holiday spike',
    }
    fin_rows.append({
        'year':              2025,
        'month':             month,
        'month_name':        date(2025,month,1).strftime('%B'),
        'total_opex_usd':    opex,
        'ebitda_usd':        ebitda,
        'headcount':         142 + month,
        'external_events':   events.get(month,''),
        'data_quality_flag': 'PARTIAL' if month == DROP_MONTH else 'OK',
    })

with open(os.path.join(BASE_DIR, 'financials_monthly.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=fin_rows[0].keys())
    w.writeheader(); w.writerows(fin_rows)
print(f"  -> {len(fin_rows)} rows")
print("\nAll seed data generated in data/seed/")
