import re

import dredkit

regex_instance = re.compile(r"wasm\s*?=\s*?([a-zA-Z_$].*?);")
function_instance = lambda match: f"wasm = {match[1]}; interstellar.patcher.setWasmInstance(wasm);"

regex_module = re.compile(r"init\.__wbindgen_wasm_module\s*?=\s*?([a-zA-Z_$].*?);")
function_module = lambda \
        match: f"init.__wbindgen_wasm_module = {match[1]}; interstellar.patcher.setWasmModule(init.__wbindgen_wasm_module);"


def patch(path):
    with open(path + f"js/{dredkit.wasmbindgen}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()

    # js = regex_module.sub(function_module, js)
    js = regex_instance.sub(function_instance, js)

    with open(path + f"js/{dredkit.wasmbindgen}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))
