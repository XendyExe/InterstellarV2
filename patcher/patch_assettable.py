import dredkit


def patch(path):
    with open(path + f"js/{dredkit.asset_table}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js += "interstellar.patcher.patchAssetTables(exports.TABLE_IMAGES, exports.TABLE_SOUNDS);"
    with open(path + f"js/{dredkit.asset_table}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))