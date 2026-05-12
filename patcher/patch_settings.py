import re
from pathlib import Path

from .. import dredkit
base_dir = Path(__file__).parent.parent

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
        {'}'}, "Manage Interstellar"),
        {match[1]}.{match[2]}("div", {'{'}style: {'{'}height: "24px"{'}'}{'}'}),
        
        // disableComplexGFX
        {match[1]}.{match[2]}("p", null, 
            {match[1]}.{match[2]}("b", null, "Disable Complex GFX"), 
            {match[1]}.{match[2]}("input", {"{"}
                    type: "checkbox", 
                    checked: this.state.I_disableComplexGFX, 
                    onInput: e => {"{"}
                        if (!((e != null && e.target instanceof HTMLInputElement))) return;
                        this.setState({'{'}I_disableComplexGFX: e.target.checked{'}'});
                        interstellar.settingsManager.settings.disableComplexGFX = e.target.checked;
                        interstellar.settingsManager.update();
                        interstellar.reload_zone();
                    {"}"}
                {"}"}
            )
        ),
        {match[1]}.{match[2]}("p", null, "This disables complex gfx effects, like the better borders and complex backdrops. Try this first if you are experiencing lag."),
        {match[1]}.{match[2]}("br", null),
        
        // disableCycleZones
        {match[1]}.{match[2]}("p", null, 
            {match[1]}.{match[2]}("b", null, "Disable Cycle Zones"), 
            {match[1]}.{match[2]}("input", {"{"}
                    type: "checkbox", 
                    checked: this.state.I_disableCycleZones, 
                    onInput: e => {"{"}
                        if (!((e != null && e.target instanceof HTMLInputElement))) return;
                        this.setState({'{'}I_disableCycleZones: e.target.checked{'}'});
                        interstellar.settingsManager.settings.disableCycleZones = e.target.checked;
                        interstellar.settingsManager.update();
                    {"}"}
                {"}"}
            ),
        ),
        {match[1]}.{match[2]}("p", null, "This disables zones that have cycling backgrounds, like day/night cycles. Disable this if you encounter large amounts of lag when loading the new backgrounds."),
        {match[1]}.{match[2]}("br", null),
        
        // disableFilters
        {match[1]}.{match[2]}("p", null, 
            {match[1]}.{match[2]}("b", null, "Disable Filters"), 
            {match[1]}.{match[2]}("input", {"{"}
                    type: "checkbox", 
                    checked: this.state.I_disableFilters, 
                    onInput: e => {"{"}
                        if (!((e != null && e.target instanceof HTMLInputElement))) return;
                        this.setState({'{'}I_disableFilters: e.target.checked{'}'});
                        interstellar.settingsManager.settings.disableFilters = e.target.checked;
                        interstellar.settingsManager.update();
                    {"}"}
                {"}"}
            ),
        ),
        {match[1]}.{match[2]}("p", null, "This disables all filters and post-processing effects that zones may want to add."),
        {match[1]}.{match[2]}("br", null),
        
        // disableZoneBackgrounds
        {match[1]}.{match[2]}("p", null, 
            {match[1]}.{match[2]}("b", null, "Disable Zone Backgrounds"), 
            {match[1]}.{match[2]}("input", {"{"}
                    type: "checkbox", 
                    checked: this.state.I_disableZoneBackgrounds, 
                    onInput: e => {"{"}
                        if (!((e != null && e.target instanceof HTMLInputElement))) return;
                        this.setState({'{'}I_disableZoneBackgrounds: e.target.checked{'}'});
                        interstellar.settingsManager.settings.disableZoneBackgrounds = e.target.checked;
                        interstellar.settingsManager.update();
                        interstellar.reload_zone();
                    {"}"}
                {"}"}
            ),
        ),
        {match[1]}.{match[2]}("p", null, "This disables all backgrounds and replaces them with a solid color. Interstellar's sprite rendering is incredibly optimized, this is usually not needed."),
        {match[1]}.{match[2]}("br", null),
        
        {match[1]}.{match[2]}("p", null, 
            {match[1]}.{match[2]}("b", null, "Disable Interstellar Telemetry"), 
            {match[1]}.{match[2]}("input", {"{"}
                    type: "checkbox", 
                    checked: this.state.I_disableTelemetry, 
                    onInput: e => {"{"}
                        if (!((e != null && e.target instanceof HTMLInputElement))) return;
                        this.setState({'{'}I_disableTelemetry: e.target.checked{'}'});
                        interstellar.settingsManager.settings.disableTelemetry = e.target.checked;
                        interstellar.settingsManager.update();
                    {"}"}
                {"}"}
            ),
        ),
        {match[1]}.{match[2]}("p", null, "This disables Interstellar's connection to the telemetry server, and disable your badge after a while. Some mods may need telemetry enabled to work due to needing event track data or communications. When telemetry is enabled, your account name, account color, enabled mods, user agent, and gpu vendor will be shared. Requires reload."),
        {match[1]}.{match[2]}("br", null),
        
        {match[1]}.{match[2]}("p", null, 
            {match[1]}.{match[2]}("b", null, "Disable Interstellar Badge"), 
            {match[1]}.{match[2]}("input", {"{"}
                    type: "checkbox", 
                    checked: this.state.I_disableInterstellarBadge, 
                    onInput: e => {"{"}
                        if (!((e != null && e.target instanceof HTMLInputElement))) return;
                        this.setState({'{'}I_disableInterstellarBadge: e.target.checked{'}'});
                        interstellar.settingsManager.settings.disableInterstellarBadge = e.target.checked;
                        interstellar.settingsManager.update();
                    {"}"}
                {"}"}
            ),
        ),
        {match[1]}.{match[2]}("p", null, "This hides the interstellar badges. May require reload."),
        {match[1]}.{match[2]}("br", null),
        
                {match[1]}.{match[2]}("p", null, 
            {match[1]}.{match[2]}("b", null, "Disable transition glitches"), 
            {match[1]}.{match[2]}("input", {"{"}
                    type: "checkbox", 
                    checked: this.state.I_disableGlitchEffect, 
                    onInput: e => {"{"}
                        if (!((e != null && e.target instanceof HTMLInputElement))) return;
                        this.setState({'{'}I_disableGlitchEffect: e.target.checked{'}'});
                        interstellar.settingsManager.settings.disableGlitchEffect = e.target.checked;
                        interstellar.settingsManager.update();
                    {"}"}
                {"}"}
            ),
        ),
        {match[1]}.{match[2]}("p", null, "Disables the glitch effect."),
        {match[1]}.{match[2]}("br", null),
"""

def patch(path):
    with open(base_dir / path / f"js/{dredkit.settings}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js = regex_audio_settings.sub(function_audio_settings, js)
    js = regex_init_settings.sub(function_init_settings, js)
    js = regex_modify_assets.sub(function_modify_assets, js)

    with open(base_dir / path / f"js/{dredkit.settings}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))

