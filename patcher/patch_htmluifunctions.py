import re
from pathlib import Path

from .. import dredkit
base_dir = Path(__file__).parent.parent

replacer = '.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\'/g, "&#39;")'

regex_inputListeners = re.compile(r"([a-zA-Z_$]+)\.addEventListener\(\"(keydown|input)\", ?", re.MULTILINE | re.DOTALL)
function_inputListeners = lambda match: f"("
regex_motdSet = re.compile(r"\.textContent ?= ?([a-zA-Z0-9$_]+)\.filterWords\(([a-zA-Z0-9$_]+)\)", re.MULTILINE)
function_motdSet = lambda match: f".innerHTML = interstellar.patcher.processMOTD({match[1]}.filterWords({match[2]}){replacer});"

regex_chatSet = re.compile(r"if ?\(([a-zA-Z0-9_$]+)\) ?\{.*?if ?\(([a-zA-Z0-9_$]+)\.value ?!= ?\"\" ?&& ?([a-zA-Z0-9_$]+)\.time\.perf_now ?- ?([a-zA-Z0-9_$]+) ?< ?([103e]+)\) ?{.*?return.*?}", re.MULTILINE | re.DOTALL)
function_chatSet =  lambda match: f"""if ({match[1]}) {"{"}
"""
def patch(path):
    with open(base_dir / path / f"js/{dredkit.htmluifunctions}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()

    js = regex_inputListeners.sub(function_inputListeners, js)
    js = regex_chatSet.sub(function_chatSet, js)

    closeChatVariable = re.search(r"closeChat: ?\(\) ?=> ?([a-zA-Z_$]+),", js, re.MULTILINE).group(1)
    js = re.sub(fr"function {closeChatVariable}\(\) ?" + "{", lambda match: f"function {closeChatVariable}()" + "{interstellar.patcher.onChatClose();", js, re.MULTILINE)
    js = regex_motdSet.sub(function_motdSet, js)
    with open(base_dir / path / f"js/{dredkit.htmluifunctions}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

