import re
from pathlib import Path

from .. import dredkit
base_dir = Path(__file__).parent.parent


def patch(path):
    with open(base_dir / path / f"js/{dredkit.setup}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()

    js = js.replace("console.log", "")

    with open(base_dir / path / f"js/{dredkit.setup}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

