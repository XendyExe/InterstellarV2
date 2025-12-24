import re

import dredkit

regex_tryimport = re.compile(r"tryImport\(([a-zA-Z0-9_$]+)\) ?{", re.MULTILINE)
function_tryimport = lambda match: f"tryImport({match.group(1)}) " + "{ return interstellar.tryImport(" + match.group(1) + ");"

def patch(path):
    with open(path + f"js/{dredkit.modfiledatabase}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()

    js = regex_tryimport.sub(function_tryimport, js)

    with open(path + f"js/{dredkit.modfiledatabase}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

