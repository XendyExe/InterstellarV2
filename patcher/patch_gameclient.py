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
function_chatcallback = lambda match: f".setChatCallback(interstellar.patcher.sendChatCallback = ({match[1]}, skip) => " + "{if (!skip){" + f"{match[1]} = interstellar.patcher.onSendChat({match[1]}); if (!{match[1]} || {match[1]} == \"\") return;" + "};"

regex_warninggrief = re.compile(r'([a-zA-Z0-9_$]+)\.writeChat\(`<b class="warning">', re.MULTILINE)
function_warninggrief = lambda match: f"if (interstellar.patcher.enableGriefMessages) {match[1]}.writeChat(`<b class='warning'>"

regex_setupadverts = re.compile(r"([A-Za-z0-9$_]+)\.setInGameAdvertAssets\(([A-Za-z0-9$_]+)\);", re.MULTILINE)
function_setupadverts = lambda match: f"interstellar.patcher.processAdverts({match[2]});{match[1]}.setInGameAdvertAssets({match[2]});"

regex_renderadverts = re.compile(r"([A-Za-z0-9$_]+)\.render_pass_billboards\((.*?)\)", re.MULTILINE)
function_renderadverts = lambda match: f"if (interstellar.patcher.renderAdverts()) {match[1]}.render_pass_billboards({match[2]});"

regex_clickadverts = re.compile(r"let ([a-zA-Z0-9_$]+) = ([a-zA-Z0-9_$]+)\.cl_module\.get_advert_url\(this\.hover_sign\);")
function_clickadverts = lambda match: f"let {match[1]} = ({match[2]}).cl_module.get_advert_url(this.hover_sign);{match[1]} = interstellar.patcher.clickAdverts({match[1]}, this.hover_sign);"

regex_drawontop = re.compile(r"(if \([a-zA-Z0-9$_]+\) \{.*?\.drawDebugInfo.*?\})", re.MULTILINE | re.DOTALL)
function_drawontop = lambda match: f"interstellar.patcher.drawOnTop();{match[1]}"

regex_renderpass1 = re.compile(r"([a-zA-Z0-9_$]+)\.render_pass_1\((.*?)\);?", re.MULTILINE)
function_renderpass1 = lambda match: f"if (interstellar.patcher.rp1({match[1]})) {match[1]}.render_pass_1({match[2]});"
regex_renderpass2 = re.compile(r"([a-zA-Z0-9_$]+)\.render_pass_2\((.*?)\);?", re.MULTILINE)
function_renderpass2 = lambda match: f"if (interstellar.patcher.rp2({match[1]})) {match[1]}.render_pass_2({match[2]});"
regex_renderpass3 = re.compile(r"([a-zA-Z0-9_$]+)\.render_pass_3\((.*?)\);?", re.MULTILINE)
function_renderpass3 = lambda match: f"if (interstellar.patcher.rp3({match[1]})) {match[1]}.render_pass_3({match[2]});"

def patch(path):
    with open(path + f"js/{dredkit.game_client}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js = regex_frame_start.sub(function_frame_start, js)
    js = regex_ingame_title.sub(function_ingame_title, js)
    js = regex_outofgame_title.sub(function_outofgame_title, js)
    js = regex_frame_end.sub(function_frame_end, js)
    js = regex_chatcallback.sub(function_chatcallback, js)
    js = regex_warninggrief.sub(function_warninggrief, js)
    js = regex_setupadverts.sub(function_setupadverts, js)
    js = regex_renderadverts.sub(function_renderadverts, js)
    js = regex_clickadverts.sub(function_clickadverts, js)
    js = regex_drawontop.sub(function_drawontop, js)
    js = regex_renderpass1.sub(function_renderpass1, js)
    js = regex_renderpass2.sub(function_renderpass2, js)
    js = regex_renderpass3.sub(function_renderpass3, js)
    with open(path + f"js/{dredkit.game_client}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))
