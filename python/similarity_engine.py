"""
Analog Scout AI - Similarity Engine (prototype)
البيانات في قسم __main__ وهمية للتجربة فقط، استبدلها ببيانات DEM حقيقية.
"""
import numpy as np
import pandas as pd

# الخصائص الرقمية + أوزانها (قابلة للتعديل)
NUMERIC = ["relief_m", "mean_slope_deg", "roughness"]
WEIGHTS = {"relief_m": 0.25, "mean_slope_deg": 0.25, "roughness": 0.20, "geology": 0.30}

# مصفوفة تشابه الأصناف الجيولوجية (0..1) - يُفضّل أن يضبطها مختص
GEO_SIM = {
    ("basalt", "basalt"): 1.0,
    ("basalt", "volcanic_ash"): 0.7,
    ("basalt", "sedimentary"): 0.3,
    ("volcanic_ash", "volcanic_ash"): 1.0,
    ("sedimentary", "sedimentary"): 1.0,
    ("volcanic_ash", "sedimentary"): 0.3,
}


def geo_similarity(a, b):
    return GEO_SIM.get((a, b), GEO_SIM.get((b, a), 0.0))


def fit_scaler(df):
    """نوحّد المقاييس بالمتوسط والانحراف المعياري لمجموعة المواقع الأرضية."""
    return df[NUMERIC].mean(), df[NUMERIC].std(ddof=0).replace(0, 1)


def similarity(ref, candidates, scaler, tau=1.5):
    """
    ref: dict لخصائص الموقع المرجعي (القمر/المريخ)
    candidates: DataFrame للمواقع الأرضية (عمود name + الخصائص)
    tau: يتحكم في سرعة نزول الدرجة مع المسافة
    يرجع DataFrame مرتباً مع مساهمة كل خاصية.
    """
    mean, std = scaler
    ref_z = (pd.Series({k: ref[k] for k in NUMERIC}) - mean) / std
    z = (candidates[NUMERIC] - mean) / std

    # مربع الفرق الموزون لكل خاصية رقمية
    sq = pd.DataFrame({k: WEIGHTS[k] * (z[k] - ref_z[k]) ** 2 for k in NUMERIC})
    sq["geology"] = WEIGHTS["geology"] * (
        1 - candidates["geology"].apply(lambda g: geo_similarity(ref["geology"], g))
    ) ** 2

    D = np.sqrt(sq.sum(axis=1))          # Weighted Euclidean Distance
    S = 100 * np.exp(-D / tau)           # Similarity Score (مؤشر وليس احتمالاً)

    out = candidates[["name"]].copy()
    out["score"] = S.round(1)
    out["distance"] = D.round(3)
    out = pd.concat([out, sq.add_prefix("contrib_")], axis=1)
    return out.sort_values("score", ascending=False).reset_index(drop=True)


def explain(row, top_k=2):
    """نص تفسير مبدئي من القوالب؛ يمكن تمريره لاحقاً إلى LLM لصياغة أجمل."""
    contrib = {c.replace("contrib_", ""): row[c] for c in row.index if c.startswith("contrib_")}
    ordered = sorted(contrib, key=contrib.get)
    close, far = ordered[:top_k], ordered[-1]
    return (f"{row['name']} ranked with score {row['score']} because it is closest in "
            f"{', '.join(close)}, but differs most in {far}. "
            f"Atmospheric/thermal conditions are not modeled.")


if __name__ == "__main__":
    earth = pd.DataFrame([
        {"name": "Hoggar, Algeria", "relief_m": 1800, "mean_slope_deg": 14, "roughness": 0.62, "geology": "basalt"},
        {"name": "Atacama, Chile", "relief_m": 900, "mean_slope_deg": 6, "roughness": 0.30, "geology": "sedimentary"},
        {"name": "Death Valley, USA", "relief_m": 1500, "mean_slope_deg": 10, "roughness": 0.48, "geology": "volcanic_ash"},
        {"name": "Tibesti, Chad", "relief_m": 2200, "mean_slope_deg": 16, "roughness": 0.70, "geology": "basalt"},
    ])
    jezero = {"relief_m": 1600, "mean_slope_deg": 12, "roughness": 0.55, "geology": "basalt"}

    res = similarity(jezero, earth, fit_scaler(earth))
    print(res[["name", "score", "distance"]])
    print()
    print(explain(res.iloc[0]))
