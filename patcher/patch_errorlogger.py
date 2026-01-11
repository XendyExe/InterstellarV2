import re

import dredkit

regex_error_logging = re.compile(r"fetch\(\"/error_report\",")
function_error_logging = lambda match: f"("


def patch(path):
    with open(path + f"js/{dredkit.errorlogging}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()

    js = regex_error_logging.sub(function_error_logging, js)

    with open(path + f"js/{dredkit.errorlogging}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

