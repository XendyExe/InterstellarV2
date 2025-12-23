import re

import dredkit

replacer = '.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\'/g, "&#39;")'

regex_inputListeners = re.compile(r"([a-zA-Z_$]+)\.addEventListener\(\"(keydown|input)\", ?", re.MULTILINE | re.DOTALL)
function_inputListeners = lambda match: f"("
regex_motdSet = re.compile(r"\.textContent ?= ?([a-zA-Z0-9$_]+)\.filterWords\(([a-zA-Z0-9$_]+)\)", re.MULTILINE)
function_motdSet = lambda match: f".innerHTML = interstellar.patcher.processMOTD({match[1]}.filterWords({match[2]}){replacer});"
def patch(path):
    with open(path + f"js/{dredkit.htmluifunctions}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()

    js = regex_inputListeners.sub(function_inputListeners, js)

    closeChatVariable = re.search(r"closeChat: ?\(\) ?=> ?([a-zA-Z_$]+),", js, re.MULTILINE).group(1)
    js = re.sub(fr"function {closeChatVariable}\(\) ?" + "{", lambda match: f"function {closeChatVariable}()" + "{interstellar.patcher.onChatClose();", js, re.MULTILINE)
    js = regex_motdSet.sub(function_motdSet, js)
    with open(path + f"js/{dredkit.htmluifunctions}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

