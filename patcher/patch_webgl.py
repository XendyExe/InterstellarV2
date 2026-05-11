import re
from pathlib import Path

from .. import dredkit
base_dir = Path(__file__).parent.parent

regex_contex_creation = re.compile(r"let\s+([a-zA-Z_$]+?)\s*?=\s*?([a-zA-Z_$]+?).getContext\(\"webgl\", ?({.*?})\);", re.DOTALL | re.MULTILINE)
function_context_creation = lambda match: f"let {match[1]}=interstellar.patcher.setWebgl({match[2]}.getContext(\"webgl2\", {'{' + match[3][1:-1] + '}'}));";

def patch(path):
    with open(base_dir / path / f"js/{dredkit.webgl}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()

    js = regex_contex_creation.sub(function_context_creation, js)

    with open(base_dir / path / f"js/{dredkit.webgl}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

