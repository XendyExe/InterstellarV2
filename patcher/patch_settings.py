import re

import dredkit

regex_audio_settings = re.compile(r"([a-zA-Z0-9$_]+)\.([a-zA-Z0-9$_]+)\(([a-zA-Z0-9$_]+),\s*{\s*label:\s*\"Volume\",\s*(.*?)}\)\)", re.RegexFlag.MULTILINE | re.RegexFlag.DOTALL)
function_audio_settings = lambda match: f"""{match[1]}.{match[2]}({match[3]}, {'{'}
            label: "SFX",{match[4]}
        {'}'}),
        {match[1]}.{match[2]}({match[3]}, {'{'}
            label: "Music",
            value: this.state.I_musicVolume,
            onUpdate: e => {'{'}
                this.setState({'{'}I_musicVolume: e{'}'});
                interstellar.settingsManager.settings.musicVolume = e;
                interstellar.settingsManager.update();
            {'}'}
        {'}'})
)"""

regex_init_settings = re.compile(r"this\.state\s*=\s*([a-zA-Z0-9_$]+)\.cloneUserSettings\(\);?", re.RegexFlag.MULTILINE | re.RegexFlag.DOTALL)
function_init_settings = lambda match: f"""this.state = {match[1]}.cloneUserSettings();interstellar.settingsManager.createState(this.state);"""

regex_modify_assets = re.compile(r"([a-zA-Z0-9$_]+)\.([a-zA-Z0-9$_]+)\(\"button\",\s*{\s*onClick:\s*\(\)\s*=>\s*([a-zA-Z0-9$_]+)\(\"mod_assets\"\)\s*},\s*\"Modify Assets\"\)", re.RegexFlag.MULTILINE | re.RegexFlag.DOTALL)
function_modify_assets = lambda match: f"""{match[1]}.{match[2]}("button", {'{'}
            onClick: () => {'{'}
                interstellar.modpackManager.open();
            {'}'},
            id: "manageInterstellarButton"
        {'}'}, "Manage Interstellar")
"""

def patch(path):
    with open(path + f"js/{dredkit.settings}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js = regex_audio_settings.sub(function_audio_settings, js)
    js = regex_init_settings.sub(function_init_settings, js)
    js = regex_modify_assets.sub(function_modify_assets, js)

    with open(path + f"js/{dredkit.settings}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

