"""Build data/problems-2016.json from the MoonBoardRNN scrape of the MoonBoard 2016 set (40°).

  git clone --depth 1 https://github.com/jrchang612/MoonBoardRNN
  python3 -I tools/convert_moonboardrnn.py MoonBoardRNN/raw_data/moonGen_scrape_2016_final

The source file is a Python pickle. It is loaded with a restricted unpickler that refuses to
import any code, so a tampered file can't run anything.
"""
import json, os, pickle, sys

class SafeUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        raise pickle.UnpicklingError(f"refusing to load {module}.{name}")

def hold(p):  # [col, row] zero-based -> "F5"
    return chr(65 + p[0]) + str(p[1] + 1)

src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), "..", "data", "problems-2016.json")
with open(src, "rb") as f:
    raw = SafeUnpickler(f).load()

problems = []
for pid, x in sorted(raw.items(), key=lambda kv: int(kv[0])):
    setter = x.get("setter") or {}
    problems.append({
        "id": int(pid),
        "name": x["url"].rsplit("/", 1)[-1].replace("-", " "),
        "url": x["url"],
        "grade": x["grade"],
        "user_grade": x["user_grade"],
        "benchmark": x["is_benchmark"],
        "repeats": x["repeats"],
        "setter": setter.get("Nickname"),  # nickname only, no real names or locations
        "start": [hold(p) for p in x["start"]],
        "middle": [hold(p) for p in x["mid"]],
        "finish": [hold(p) for p in x["end"]],
    })

os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as f:
    json.dump(problems, f, indent=0)
print(f"Wrote {len(problems)} problems to {os.path.normpath(out)}")
