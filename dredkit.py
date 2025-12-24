import re

import jsbeautifier

asset_table = "AssetTable"
wasmbindgen = "WasmBindGen"
game_client = "GameClient"
create_game_js = "CreateGameJS"
webgl = "GetWebgl"
client_socket = "ClientSocket"
text_utilities = "TextUtilities"
ship_hud = "ShipHUD"
debug_drawer = "DebugInfoManager"
settings = "UserSettingsUI"
initgame = "InitGame"
objectmenus = "ObjectMenus"
teammanager = "TeamManagerLogger"
shipyard = "Shipyard"
inventory = "InventoryManager"
htmluifunctions = "HTMLUIFunctions"
msgpack = "msgpack"
modfiledatabase = "ModFileDatabase"

source_map = {
    "ErrorLogger": ["reportError:"],
    "Client": ["exports.cl_module"],
    "ReplicatedClasses": ["ReplicatedWorldManager:"],
    "SocketMsgTypes": ["MsgType:"],
    "Constants": ["VIEW_ASPECT:"],
    "TickerTime": ["parseTime:"],
    "Audio": ["cl_module.Audio.init()"],
    "Graphics": ["BASE_SCALE:"],
    "InputManager": ["CMD_WINDOW:"],
    "WorldManager": ["LATEST_PREDICTED_COMMAND:"],
    htmluifunctions: ["setChatCallback:"],
    "HTMLTeamManager": ["handleCaptainMessage:"],
    "HTMLManager": ["drawUi:"],
    "CommsManager": ["setCommsCallback:"],
    "DisconnectDialogue": ['"openDisconnectDialog"'],
    "UserSettingManager": ["USER_SETTINGS:"],
    "TextFormatter": ["escapeHTML:"],
    objectmenus: ["setPUICommandCallback:"],
    inventory: ["setInventoryState:"],
    teammanager: ["setCanSaveShip:"],
    "ProfanityFilterer": ["getProfanityMode:"],
    "Localizer": ["LOCALIZE_ID:"],
    "Items": ["BuildAngle:"],
    "AssetManager": ["getImageURL:"],
    debug_drawer: ["drawDebugInfo:"],
    "getImmUI": ['"getImmUI"'],
    "OutfitManager": ["getLocalOutfit:"],
    "AccountManager": ["getAccount:"],
    "PromptManager": ["closeModal:"],
    "CursorManager": ["isBuildPointInBuildRange:"],
    "PhysicsFilters": ["DEFAULT_FILTER:"],
    "ScannerOpeners": ["openItemManifest:"],
    "CheatMenuManager": ["getCheatMenuOpen:"],
    "ConfigEntId": ["getConfigEntId:"],
    "LabManager": ["set_lab_mode:"],
    "SendToServer": ["SEND_TO_SERVER:"],
    "BlueprintScannerManager": ["BLUEPRINT_SCANNER_SETTINGS:"],
    "SaveFile": ['"saveFile"'],
    "ServerConstants": ["CONNECT_PROTO:"],
    text_utilities: ["getZoneName:"],
    "preact": ["exports.Component"],
    "ItemTable": ["ItemID:"],
    "RunOnClient": ['"RUN_ON_CLIENT"'],
    "ColorUtils": ["numberToHexColor:"],
    "PatreonUtils": ["getPledgeTierInfoFromGameRank:"],
    "ServerInstanceType": ['"ServerInstanceType"'],
    "RescaleWindows": ['"rescale_windows"'],
    "Setup": ['parseInviteAndClearURL:'],
    "GAME_VERSION": ['"GAME_VERSION",'],
    "TOSNoticeManager": ['"checkNotice"'],
    shipyard: ['"StartUIShipyard"'],
    "LoginManager": ['"checkAccountOrPromptLogin"'],
    "EarlyImage": ['"getEarlyImageURL"'],
    "CookieManager": ['getCookiePrefix:'],
    "Hostname": ['"getHostName"'],
    "LoginButtons": ['"renderLoginButtons"'],
    modfiledatabase: ['"modFileDB"'],
    "AdManager": ["initAds:"],
    "ServerOption": ['"ServerOption"'],
    "LOCATION_WASM": ["exports.default", ".wasm", "/x/"],
    "LOCATION_WASM_JS": ["exports.url", ".js", "/x/", "wasm."],
    "LOCATION_GAME_JS": ["exports.url", ".js", "/x/", "game."],
    ship_hud: ['"drawShipHUD"'],
    "BadgeManager": ["renderUserBadge:"],
    initgame: ['"HARD BANNED"'],
    create_game_js: [".launch_background_workers();"],
    asset_table: ['exports.TABLE_IMAGES=', 'exports.TABLE_SOUNDS'],
    wasmbindgen: ["function takeObject(t){"],
    game_client: ['"GameClient"', "/huge_signs/manifest.json"],
    webgl: ["get_ctx:", "get_driver_info:"],
    client_socket: ['"ClientSocket",'],
    settings: ['toggleUI:', 'setModDBBroken:', 'setFilePanelFiles:'],
    msgpack: ["\"encode\"", "\"decode\"", "\"decodeMulti\"", "exports.decode", "exports.encode"]
}


def prettify_js(js_code: str) -> str:
    options = jsbeautifier.default_options()
    options.indent_size = 4
    options.indent_char = ' '
    options.max_preserve_newlines = 2
    options.preserve_newlines = True
    options.keep_array_indentation = False
    options.break_chained_methods = False
    options.indent_scripts = 'normal'
    options.brace_style = 'collapse'
    options.space_before_conditional = True
    options.unescape_strings = False
    options.jslint_happy = False
    options.end_with_newline = True
    options.wrap_line_length = 0
    options.indent_inner_html = False
    options.comma_first = False
    options.e4x = False
    options.indent_empty_lines = False

    return jsbeautifier.beautify(js_code, options)
