import re

import dredkit


def find_patch():
    pass


def patch(path):
    patchFile(f"{path}/js/{dredkit.objectmenus}.js", patch_objectmenus)
    patchFile(f"{path}/js/{dredkit.teammanager}.js", patch_teammanager)
    patchFile(f"{path}/js/{dredkit.settings}.js", patch_settings)
    patchFile(f"{path}/js/{dredkit.shipyard}.js", patch_shipyard)
    patchFile(f"{path}/js/{dredkit.inventory}.js", patch_inventory)


components_regex = re.compile(r"class ([a-zA-Z0-9_$]+) extends ([a-zA-Z0-9_$]+).Component {(.*?\n)}",
                              re.MULTILINE | re.DOTALL)
render_function_regex = re.compile(r"render\(\) ?{(.*?)\n {4}}", re.MULTILINE | re.DOTALL)


def patchFile(path, func):
    with open(path, "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js = re.sub(components_regex, func, js)
    with open(path, "w", encoding="utf-8") as js_file:
        js_file.write(js)


def contains_all(string: str, items: list[str]) -> bool:
    return all(item in string for item in items)

def patch_objectmenus(component: re.Match):
    body = component.group(3)
    if contains_all(body, ["item_launcher", "angle", "this.state.power", "this.state.angle"]):
        def replace_launcher(body: re.Match):
            body = body.group(1).replace("return ", "const is_vnode =")
            body += ";interstellar.uiEventDispatcher.renderLauncherPUIEvent(this, is_vnode);return is_vnode;"
            return f"render() " + "{" + body + "}"
        body = render_function_regex.sub(replace_launcher, body)
    elif contains_all(body, ["this.signTextInput.focus()", "this.state.text", "this.state.mode", "SignMode"]):
        def replace_sign(body: re.Match):
            body = body.group(1).replace("return ", "const is_vnode =")
            body += ";interstellar.uiEventDispatcher.renderSignPUIEvent(this, is_vnode);return is_vnode;"
            return f"render() " + "{" + body + "}"
        body = render_function_regex.sub(replace_sign, body)
    elif contains_all(body, ["patron-recipe", "ITEM_TABLE_INSTANCES", "getResourceStateFromFabricator"]):
        def replace_fabricator(body: re.Match):
            body = "const is_vnode = ".join(body.group(1).rsplit("return ", 1))
            body += ";interstellar.uiEventDispatcher.renderCraftingPUIEvent(this, is_vnode);return is_vnode;"
            return f"render() " + "{" + body + "}"
        body = render_function_regex.sub(replace_fabricator, body)
    elif contains_all(body, ["blueprint_scanner_load", "ClMsgBlueprint", "Blueprint Text"]):
        def replace_blueprint(body: re.Match):
            body = body.group(1).replace("return ", "const is_vnode =")
            body += ";interstellar.uiEventDispatcher.renderBlueprintPUIEvent(this, is_vnode);return is_vnode;"
            return f"render() " + "{" + body + "}"
        body = render_function_regex.sub(replace_blueprint, body)
    return f"class {component.group(1)} extends {component.group(2)}.Component " + "{" + body + "}"



def patch_teammanager(component: re.Match):
    body = component.group(3)
    def replace_teammanager(body: re.Match):
        splits = body.group(1).rsplit("return ", 1)
        body = f"""if (this.state.tab == "settings") interstellar.uiEventDispatcher.renderShipSettings(this, {splits[1][-2]});
        else if (this.state.tab == "crew") interstellar.uiEventDispatcher.renderCrewList(this, {splits[1][-2]});
        const is_vnode = """.join(splits)
        body += ";interstellar.uiEventDispatcher.renderCrewControl(this, is_vnode); return is_vnode;"
        return f"render() " + "{" + body + "}"
    body = render_function_regex.sub(replace_teammanager, body)
    return f"class {component.group(1)} extends {component.group(2)}.Component " + "{" + body + "}"


def patch_settings(component: re.Match):
    body = component.group(3)
    if contains_all(body, ["\"Settings\"", "USER_SETTINGS", "\"Account\""]):
        def replace_settings(body: re.Match):
            body = body.group(1).replace("return ", "const is_vnode =")
            body += ";interstellar.uiEventDispatcher.renderSettings(this, is_vnode);return is_vnode;"
            return f"render() " + "{" + body + "}"
        body = render_function_regex.sub(replace_settings, body)
    elif contains_all(body, ["this.cached_uis", "this.props.ui", "this.cached_uis.map"]):
        def inject_is_settings(body: re.Match):
            outputVar = body.group(1).strip()[-2]
            body = f"{outputVar} = interstellar.patcher.toggleUIPatch(this.props.ui, {outputVar}); return ".join(body.group(1).rsplit("return ", 1))
            return f"render() " + "{" + body + "}"
        body = render_function_regex.sub(inject_is_settings, body)
    return f"class {component.group(1)} extends {component.group(2)}.Component " + "{" + body + "}"


returnSub = re.compile(r"return (.*?\))[ \n]*?}", re.MULTILINE | re.DOTALL)
sideMenuSub = re.compile(r"if ?\(!this\.state\.hide_menu\) ?{.*?([a-zA-Z0-9$_]+) ?= ?(.*?)} ?else ?{", re.MULTILINE | re.DOTALL)
def patch_shipyard(component: re.Match):
    body = component.group(3)
    if contains_all(body, ['"https://www.patreon.com/cogg"', "shouldComponentUpdate"]):
        def replace_adslot(body: re.Match):
            body = body.group(1).replace("return ", "const is_vnode =")
            body += ";interstellar.uiEventDispatcher.renderShiplistAdSlotEvent(this, is_vnode);return is_vnode;"
            return f"render() " + "{" + body + "}"
        body = render_function_regex.sub(replace_adslot, body)
    elif contains_all(body, ['"no_ship_icon"', "this.props.hex_code", "shipyard-item", "this.props.crew_count", "this.props.name"]):
        def return_sub(match: re.Match):
            dispatcher = ";interstellar.uiEventDispatcher.renderBigShipEntryEvent(this, is_vnode)" if "sy-title" in match.group(1) else "interstellar.uiEventDispatcher.renderSmallShipEntryEvent(this, is_vnode)"
            return f"const is_vnode = {match.group(1)};\n{dispatcher};\nreturn is_vnode;" + "}"
        body = returnSub.sub(return_sub, body)
    elif contains_all(body, ["this.props.show_ads", "n.USER_SETTINGS.preferred_server", "refreshShipList()", "this.props.join_callback"]):
        def sidemenu_sub(match: re.Match):
            return "if (!this.state.hide_menu) {" + f"const is_vnode = {match[2]}; interstellar.uiEventDispatcher.renderShiplistSidebar(this, is_vnode); {match[1]} = is_vnode;" + "} else {"
        body = sideMenuSub.sub(sidemenu_sub, body)
        print(body)
    return f"class {component.group(1)} extends {component.group(2)}.Component " + "{" + body + "}"

def patch_inventory(component: re.match):
    body = component.group(3)
    def replace_inventory(body: re.Match):
        body = "const is_vnode = ".join(body.group(1).rsplit("return ", 1))
        body += ";interstellar.uiEventDispatcher.inventoryUpdate(this, is_vnode); return is_vnode;"
        return f"render() " + "{" + body + "}"
    body = render_function_regex.sub(replace_inventory, body)
    return f"class {component.group(1)} extends {component.group(2)}.Component " + "{" + body + "}"

if __name__ == "__main__":
    patch("../cache/prod_fetch")