"""Copy public-domain exercise photos from free-exercise-db (github.com/yuhonas/free-exercise-db,
Unlicense) into public/ex and write src/data/library.json with names and how-to steps."""
import json, sys, pathlib
from PIL import Image

SRC = pathlib.Path(sys.argv[1])          # path to a free-exercise-db checkout
ROOT = pathlib.Path(__file__).resolve().parent.parent
MAP = {
  "bench": "Barbell_Bench_Press_-_Medium_Grip", "incdb": "Incline_Dumbbell_Press", "dbsp": "Seated_Dumbbell_Press",
  "pecdeck": "Butterfly", "latraise": "Side_Lateral_Raise", "pushdown": "Triceps_Pushdown_-_Rope_Attachment",
  "ohext": "Cable_Rope_Overhead_Triceps_Extension", "pulldown": "Wide-Grip_Lat_Pulldown", "cablerow": "Seated_Cable_Rows",
  "dbrow": "One-Arm_Dumbbell_Row", "facepull": "Face_Pull", "curl": "EZ-Bar_Curl", "hammer": "Hammer_Curls",
  "backext": "Hyperextensions_Back_Extensions", "squat": "Barbell_Squat", "legpress": "Leg_Press", "lunge": "Dumbbell_Lunges",
  "legext": "Leg_Extensions", "lyingcurl": "Lying_Leg_Curls", "standcalf": "Standing_Calf_Raises", "plank": "Plank",
  "cablecrunch": "Cable_Crunch", "hkr": "Hanging_Leg_Raise", "deadbug": "Dead_Bug", "sideplank": "Side_Bridge",
  "dbbench": "Dumbbell_Bench_Press", "csrow": "Lying_T-Bar_Row", "assistpull": "Band_Assisted_Pull-Up",
  "machinesp": "Machine_Shoulder_Military_Press", "cablelat": "Cable_Seated_Lateral_Raise", "cablecurl": "Standing_Biceps_Cable_Curl",
  "assistdip": "Dip_Machine", "rdl": "Romanian_Deadlift", "hipthrust": "Barbell_Hip_Thrust", "goblet": "Goblet_Squat",
  "bss": "Split_Squat_with_Dumbbells", "seatedcurl": "Seated_Leg_Curl", "seatedcalf": "Seated_Calf_Raise", "pallof": "Pallof_Press",
  "walk": "Walking_Treadmill", "bike": "Bicycling_Stationary", "mobility": "Worlds_Greatest_Stretch", "stretch": "Hamstring_Stretch",
}
data = {e["id"]: e for e in json.load(open(SRC / "dist" / "exercises.json"))}
out = {}
for key, sid in MAP.items():
    e = data[sid]
    dest = ROOT / "public" / "ex" / key
    dest.mkdir(parents=True, exist_ok=True)
    frames = []
    for i, rel in enumerate(e["images"][:2]):
        im = Image.open(SRC / "exercises" / rel).convert("RGB")
        im.thumbnail((560, 560))
        p = dest / f"{i}.webp"
        im.save(p, "WEBP", quality=72, method=6)
        frames.append(f"ex/{key}/{i}.webp")
    out[key] = {"source": sid, "name": e["name"], "steps": e["instructions"], "frames": frames}
(ROOT / "src" / "data").mkdir(parents=True, exist_ok=True)
json.dump(out, open(ROOT / "src" / "data" / "library.json", "w"), indent=1, ensure_ascii=False)
print(len(out), "exercises written")
