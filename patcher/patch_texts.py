import re
from pathlib import Path

from .. import dredkit
base_dir = Path(__file__).parent.parent

regex_getZoneName = re.compile(r"getZoneName:\s\(\) =>\s([a-zA-Z0-9_$]+)(,?)")
function_getZoneName = lambda match: f"getZoneName: () => interstellar.patcher.patchNavNames{match[2]}"
regex_getWorldText = re.compile(r"getWorldText:\s\(\) =>\s([a-zA-Z0-9_$]+)(,?)")
function_getWorldText = lambda match: f"getWorldText: () => interstellar.patcher.patchZoneDescription{match[2]}"


regex_drawWorldInfo = re.compile(r"if\s?\(!([a-zA-Z0-9_$]+)\.HIDE_HUD\)\s?{\s*let\s+h\s?=.*?([a-zA-Z0-9])\.entityComponents.*?([a-zA-Z0-9_$]+)\.graphics\.drawTextSS\(\"Zone: \"\s?\+\s?[a-zA-Z0-9_$],\s?([a-zA-Z0-9_$]+).*?}", re.RegexFlag.MULTILINE | re.RegexFlag.DOTALL)
function_drawWorldInfo = lambda match: f"if (!{match[1]}.HIDE_HUD) interstellar.patcher.drawZoneText({match[2]}, {match[3]}, {match[4]});"
regex_patchShipInfo = re.compile(r"let \[([a-zA-Z0-9\$_]+), ?([a-zA-Z0-9\$_]+), ?([a-zA-Z0-9\$_]+), ?([a-zA-Z0-9\$_]+)\] ? = ?([a-zA-Z0-9\$_]+).entityComponents.ship_get_health_info\(([a-zA-Z0-9\$_]+).entityComponents\);")
function_patchShipInfo = lambda match: f"let [{match[1]}, {match[2]}, {match[3]}, {match[4]}] = {match[5]}.entityComponents.ship_get_health_info({match[6]}.entityComponents); interstellar.patcher.update_ship_info({match[1]}, {match[2]}, {match[3]}, {match[4]}, {match[5]}, {match[6]});"

regex_updateFrameTime = re.compile("updateFrameTime:\s?\(\)\s?=>\s?([a-zA-Z0-9_$]+)(,?)")
function_updateFrameTime = lambda match: f"updateFrameTime: ()=>interstellar.debugDrawer.updateTotalFrameTime.bind(interstellar.debugDrawer){match[2]}"
regex_drawDebugInfo = re.compile("drawDebugInfo:\s?\(\)\s?=>\s?([a-zA-Z0-9_$]+)(,?)")
function_drawDebugInfo = lambda match: f"drawDebugInfo: ()=>interstellar.debugDrawer.drawDebugInfo.bind(interstellar.debugDrawer){match[2]}"
def patch(path):
    with open(base_dir / path / f"js/{dredkit.text_utilities}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()

    js = regex_getZoneName.sub(function_getZoneName, js)
    js = regex_getWorldText.sub(function_getWorldText, js)

    with open(base_dir / path / f"js/{dredkit.text_utilities}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

    with open(base_dir / path / f"js/{dredkit.ship_hud}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js = regex_drawWorldInfo.sub(function_drawWorldInfo, js)
    js = regex_patchShipInfo.sub(function_patchShipInfo, js)

    with open(base_dir / path / f"js/{dredkit.ship_hud}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

    with open(base_dir / path / f"js/{dredkit.debug_drawer}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js = regex_updateFrameTime.sub(function_updateFrameTime, js)
    js = regex_drawDebugInfo.sub(function_drawDebugInfo, js)
    js = "interstellar.patcher.patchDebug();" + js

    with open(base_dir / path / f"js/{dredkit.debug_drawer}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

