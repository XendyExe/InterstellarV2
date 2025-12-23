import re

import dredkit

regex_handle_message = re.compile(r"this\.handleMessage\(([a-zA-Z0-9_$]+), ([a-zA-Z0-9_$]+)\.data\)",
                                  re.RegexFlag.MULTILINE)
function_handle_message = lambda match: f"let result = interstellar.patcher.handleMessage({match[1]});this.handleMessage(result, {match[2]}.data)"

regex_socket_close = re.compile(r"this\.websocket\.onclose ?= ?\(?([a-zA-Z0-9_$]+)\)? ?=> ?\{")
function_socket_close = lambda match: f"this.websocket.onclose = {match[1]} => " + "{" + "interstellar.patcher.socketclose(t);"

regex_socket_open = re.compile(r"this\.websocket\.onopen ?= ?\(\) ?=> ?\{")
function_socket_open = lambda match: f"this.websocket.onopen = () => " + "{" + "interstellar.patcher.socketopen(this.websocket);"

def patch(path):
    with open(path + f"js/{dredkit.client_socket}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()

    js = regex_handle_message.sub(function_handle_message, js)
    js = regex_socket_close.sub(function_socket_close, js)
    js = regex_socket_open.sub(function_socket_open, js)

    with open(path + f"js/{dredkit.client_socket}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))
