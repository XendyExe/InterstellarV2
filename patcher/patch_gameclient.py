import re

import dredkit

regex_frame_start = re.compile(r"([a-zA-Z$_]+?)\.graphics\.clear\((.+?)\);", re.MULTILINE)
function_frame_start = lambda match: f"interstellar.patcher.trigger_frame_start();"

regex_ingame_title = re.compile(
    r"let ([a-zA-Z$_]+?) ?= ?([a-zA-Z$_]+?)\.filterWords\(([a-zA-Z$_]+?)\.entityComponents\.world_name\(\)\) ?\+ ?\" - Deep Space Airships\";", re.MULTILINE)
function_ingame_title = lambda \
    match: f"let {match[1]} = {match[2]}.filterWords({match[3]}.entityComponents.world_name()) + \" - Interstellar\";"

regex_outofgame_title = re.compile(r"document\.title ?= ?\"Deep Space Airships\";", re.MULTILINE)
function_outofgame_title = lambda match: f"document.title = \"Interstellar\""

regex_frame_end = re.compile(r"([a-zA-Z_$]+?)\.graphics\.gfx\.text_end_frame\(\);", re.MULTILINE)
function_frame_end = lambda match: f"interstellar.patcher.trigger_frame_end(this);{match[1]}.graphics.gfx.text_end_frame();"

regex_chatcallback = re.compile(r"\.setChatCallback\(([a-zA-Z_$]+) ?=> ?{", re.MULTILINE)
function_chatcallback = lambda match: f".setChatCallback(({match[1]}) => " + "{" + f"{match[1]} = interstellar.patcher.onSendChat({match[1]}); if (!{match[1]} || {match[1]} == \"\") return;"

regex_warninggrief = re.compile(r'([a-zA-Z0-9_$]+)\.writeChat\(`<b class="warning">', re.MULTILINE)
function_warninggrief = lambda match: f"if (interstellar.patcher.enableGriefMessages) {match[1]}.writeChat(`<b class='warning'>"
def patch(path):
    with open(path + f"js/{dredkit.game_client}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js = regex_frame_start.sub(function_frame_start, js)
    js = regex_ingame_title.sub(function_ingame_title, js)
    js = regex_outofgame_title.sub(function_outofgame_title, js)
    js = regex_frame_end.sub(function_frame_end, js)
    js = regex_chatcallback.sub(function_chatcallback, js)
    js = regex_warninggrief.sub(function_warninggrief, js)
    with open(path + f"js/{dredkit.game_client}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))
