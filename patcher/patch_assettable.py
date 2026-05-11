from pathlib import Path

from .. import dredkit
base_dir = Path(__file__).parent.parent

def patch(path):
    with open(base_dir / path / f"js/{dredkit.asset_table}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js += "interstellar.patcher.patchAssetTables(exports.TABLE_IMAGES, exports.TABLE_SOUNDS);"
    with open(base_dir / path / f"js/{dredkit.asset_table}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))