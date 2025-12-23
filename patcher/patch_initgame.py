import re

import dredkit

regex_join_game = re.compile(r"async function ([a-zA-Z0-9$_]+) ?\(([a-zA-Z0-9$_]+), ?([a-zA-Z0-9$_]+)\) ?{.*?([a-zA-Z0-9$_]+)\.setOpen\(false\);", re.MULTILINE | re.DOTALL)
function_join_game = lambda match: f"const {match[1]} = window.z_joinshipfunction = async ({match[2]}, {match[3]}) =>" + "{" + f"let shouldJoin = interstellar.patcher.onJoinShip({match[2]}, {match[3]}); if (!shouldJoin) return; {match[4]}.setOpen(false);"

def patch(path):
    with open(path + f"js/{dredkit.initgame}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()

    js = regex_join_game.sub(function_join_game, js)

    with open(path + f"js/{dredkit.initgame}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

