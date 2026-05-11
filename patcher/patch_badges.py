import re
from pathlib import Path

from .. import dredkit

base_dir = Path(__file__).parent.parent

regex_personal_badge = re.compile(r'if ?\(([a-zA-Z0-9$_]+)\.length ?== ?0\) ?{.*?return ?"Badges: \(None\)"', re.MULTILINE | re.DOTALL)
function_personal_badge = lambda match: f"if (!interstellar.settingsManager.settings.disableInterstellarBadge && !{match[1]}.includes(\"interstellar\")) {match[1]}.unshift(\"interstellar\"); if ({match[1]}.length == 0) {'{'} return \"Badges: None\";"
regex_badge_info = re.compile(r'case ?"cogg":', re.MULTILINE)
function_badge_info = lambda match: f"case\"interstellar\": return {"{"}name: \"Interstellar User\", icon: \"badge/interstellar\"{"}"};case \"cogg\":"

def patch(path):
    with open(base_dir / path / f"js/{dredkit.badge_manager}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js = regex_personal_badge.sub(function_personal_badge, js)
    js = regex_badge_info.sub(function_badge_info, js)
    with open(base_dir / path / f"js/{dredkit.badge_manager}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))