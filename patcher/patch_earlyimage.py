import re
from pathlib import Path

from .. import dredkit

base_dir = Path(__file__).parent.parent

regex_interstellar_badge = re.compile(r"case ?\"no_ship_icon\":", re.MULTILINE)
function_interstellar_badge = lambda match: f"case \"badge/interstellar\": return interstellar.getBadgeURL(); case \"no_ship_icon\":"
def patch(path):
    with open(base_dir / path / f"js/{dredkit.earlyimage}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js = regex_interstellar_badge.sub(function_interstellar_badge, js)
    with open(base_dir / path / f"js/{dredkit.earlyimage}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))