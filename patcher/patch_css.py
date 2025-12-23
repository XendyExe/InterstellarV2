import json
import logging
import os
import re

import cssutils
from cssutils.css import CSSFontFaceRule
namedColors = {
  "aliceblue": "#F0F8FF",
  "antiquewhite": "#FAEBD7",
  "aqua": "#00FFFF",
  "aquamarine": "#7FFFD4",
  "azure": "#F0FFFF",
  "beige": "#F5F5DC",
  "bisque": "#FFE4C4",
  "black": "#000000",
  "blanchedalmond": "#FFEBCD",
  "blue": "#0000FF",
  "blueviolet": "#8A2BE2",
  "brown": "#A52A2A",
  "burlywood": "#DEB887",
  "cadetblue": "#5F9EA0",
  "chartreuse": "#7FFF00",
  "chocolate": "#D2691E",
  "coral": "#FF7F50",
  "cornflowerblue": "#6495ED",
  "cornsilk": "#FFF8DC",
  "crimson": "#DC143C",
  "cyan": "#00FFFF",
  "darkblue": "#00008B",
  "darkcyan": "#008B8B",
  "darkgoldenrod": "#B8860B",
  "darkgray": "#A9A9A9",
  "darkgrey": "#A9A9A9",
  "darkgreen": "#006400",
  "darkkhaki": "#BDB76B",
  "darkmagenta": "#8B008B",
  "darkolivegreen": "#556B2F",
  "darkorange": "#FF8C00",
  "darkorchid": "#9932CC",
  "darkred": "#8B0000",
  "darksalmon": "#E9967A",
  "darkseagreen": "#8FBC8F",
  "darkslateblue": "#483D8B",
  "darkslategray": "#2F4F4F",
  "darkslategrey": "#2F4F4F",
  "darkturquoise": "#00CED1",
  "darkviolet": "#9400D3",
  "deeppink": "#FF1493",
  "deepskyblue": "#00BFFF",
  "dimgray": "#696969",
  "dimgrey": "#696969",
  "dodgerblue": "#1E90FF",
  "firebrick": "#B22222",
  "floralwhite": "#FFFAF0",
  "forestgreen": "#228B22",
  "fuchsia": "#FF00FF",
  "gainsboro": "#DCDCDC",
  "ghostwhite": "#F8F8FF",
  "gold": "#FFD700",
  "goldenrod": "#DAA520",
  "gray": "#808080",
  "grey": "#808080",
  "green": "#008000",
  "greenyellow": "#ADFF2F",
  "honeydew": "#F0FFF0",
  "hotpink": "#FF69B4",
  "indianred": "#CD5C5C",
  "indigo": "#4B0082",
  "ivory": "#FFFFF0",
  "khaki": "#F0E68C",
  "lavender": "#E6E6FA",
  "lavenderblush": "#FFF0F5",
  "lawngreen": "#7CFC00",
  "lemonchiffon": "#FFFACD",
  "lightblue": "#ADD8E6",
  "lightcoral": "#F08080",
  "lightcyan": "#E0FFFF",
  "lightgoldenrodyellow": "#FAFAD2",
  "lightgray": "#D3D3D3",
  "lightgrey": "#D3D3D3",
  "lightgreen": "#90EE90",
  "lightpink": "#FFB6C1",
  "lightsalmon": "#FFA07A",
  "lightseagreen": "#20B2AA",
  "lightskyblue": "#87CEFA",
  "lightslategray": "#778899",
  "lightslategrey": "#778899",
  "lightsteelblue": "#B0C4DE",
  "lightyellow": "#FFFFE0",
  "lime": "#00FF00",
  "limegreen": "#32CD32",
  "linen": "#FAF0E6",
  "magenta": "#FF00FF",
  "maroon": "#800000",
  "mediumaquamarine": "#66CDAA",
  "mediumblue": "#0000CD",
  "mediumorchid": "#BA55D3",
  "mediumpurple": "#9370DB",
  "mediumseagreen": "#3CB371",
  "mediumslateblue": "#7B68EE",
  "mediumspringgreen": "#00FA9A",
  "mediumturquoise": "#48D1CC",
  "mediumvioletred": "#C71585",
  "midnightblue": "#191970",
  "mintcream": "#F5FFFA",
  "mistyrose": "#FFE4E1",
  "moccasin": "#FFE4B5",
  "navajowhite": "#FFDEAD",
  "navy": "#000080",
  "oldlace": "#FDF5E6",
  "olive": "#808000",
  "olivedrab": "#6B8E23",
  "orange": "#FFA500",
  "orangered": "#FF4500",
  "orchid": "#DA70D6",
  "palegoldenrod": "#EEE8AA",
  "palegreen": "#98FB98",
  "paleturquoise": "#AFEEEE",
  "palevioletred": "#DB7093",
  "papayawhip": "#FFEFD5",
  "peachpuff": "#FFDAB9",
  "peru": "#CD853F",
  "pink": "#FFC0CB",
  "plum": "#DDA0DD",
  "powderblue": "#B0E0E6",
  "purple": "#800080",
  "rebeccapurple": "#663399",
  "red": "#FF0000",
  "rosybrown": "#BC8F8F",
  "royalblue": "#4169E1",
  "saddlebrown": "#8B4513",
  "salmon": "#FA8072",
  "sandybrown": "#F4A460",
  "seagreen": "#2E8B57",
  "seashell": "#FFF5EE",
  "sienna": "#A0522D",
  "silver": "#C0C0C0",
  "skyblue": "#87CEEB",
  "slateblue": "#6A5ACD",
  "slategray": "#708090",
  "slategrey": "#708090",
  "snow": "#FFFAFA",
  "springgreen": "#00FF7F",
  "steelblue": "#4682B4",
  "tan": "#D2B48C",
  "teal": "#008080",
  "thistle": "#D8BFD8",
  "tomato": "#FF6347",
  "turquoise": "#40E0D0",
  "violet": "#EE82EE",
  "wheat": "#F5DEB3",
  "white": "#FFFFFF",
  "whitesmoke": "#F5F5F5",
  "yellow": "#FFFF00",
  "yellowgreen": "#9ACD32"
}
colors = "|".join(namedColors.keys()) + "|"
css_color_pattern = re.compile(r"""
(""" + colors + r"""
    # ---------- HEX ----------
    \#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})

  | rgb(?:a)?\(
        \s*
        (?:
            # comma syntax: rgb(255, 255, 255)
            (?:(?:\d{1,3}%?\s*,\s*){2}\d{1,3}%?(?:\s*,\s*(?:0|1|0?\.\d+))?)
          |
            # space syntax: rgb(255 255 255 / 0.5)
            (?:\d{1,3}%?(?:\s+\d{1,3}%?){2}(?:\s*/\s*(?:0|1|0?\.\d+))?)
        )
        \s*\)

  | hsl(?:a)?\(
        \s*
        (?:
            # comma syntax: hsl(240, 100%, 50%)
            (?:\d{1,3}(?:deg|grad|rad|turn)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%)
            (?:\s*,\s*(?:0|1|0?\.\d+))?
          |
            # space syntax: hsl(240 100% 50% / 0.5)
            (?:\d{1,3}(?:deg|grad|rad|turn)?(?:\s+\d{1,3}%){2}(?:\s*/\s*(?:0|1|0?\.\d+))?)
        )
        \s*\)

  | hwb\(
        \s*\d{1,3}(?:deg|grad|rad|turn)?
        (?:\s+\d{1,3}%){2}
        (?:\s*/\s*(?:0|1|0?\.\d+))?
        \s*\)

  | lab\(
        \s*\d+(?:\.\d+)?%
        (?:\s+[-+]?\d+(?:\.\d+)?){2}
        (?:\s*/\s*(?:0|1|0?\.\d+))?
        \s*\)

  | lch\(
        \s*\d+(?:\.\d+)?%
        \s+\d+(?:\.\d+)?
        \s+\d+(?:\.\d+)?(?:deg|grad|rad|turn)?
        (?:\s*/\s*(?:0|1|0?\.\d+))?
        \s*\)

  | oklab\(
        \s*\d+(?:\.\d+)?
        (?:\s+[-+]?\d+(?:\.\d+)?){2}
        (?:\s*/\s*(?:0|1|0?\.\d+))?
        \s*\)

  | oklch\(
        \s*\d+(?:\.\d+)?
        \s+\d+(?:\.\d+)?
        \s+\d+(?:\.\d+)?(?:deg|grad|rad|turn)?
        (?:\s*/\s*(?:0|1|0?\.\d+))?
        \s*\)

  | color\(
        \s*[-a-z0-9]+
        (?:\s+[-+]?\d*\.?\d+(?:%|))+
        (?:\s*/\s*(?:0|1|0?\.\d+))?
        \s*\)

  | transparent
  | currentcolor
)
""", re.IGNORECASE | re.VERBOSE)

csskit = {
    "--btn-color": [["button, .btn", "background", False]],
    "--btn-meme-color": [[".btn-meme", "background", False]],
    "--btn-red-color": [[".btn-red", "background", False]],
    "--btn-orange-color": [[".btn-orange", "background", False]],
    "--btn-yellow-color": [[".btn-yellow", "background", False]],
    "--btn-green-color": [[".btn-green", "background", False]],
    "--btn-blue-color": [[".btn-blue", "background", False]],
    "--btn-pink-color": [[".btn-pink", "background", False]],

    "--craft-color": [
        [".craft-queue > div", "background", False],
        [".craft-option", "background-color", False]
    ],
    "--craft-border-color": [
        [".craft-queue > div", "border", True],
        [".craft-option", "border", True]
    ],
    "--craft-border-hover-color": [
        [".craft-queue > div:hover", "border", True],
        [".craft-option:hover", "border", True]
    ],
    "--craft-disabled-color": [[".craft-option.disable", "background-color", False]],
    "--craft-highlighted-border-color": [[".craft-option.highlight", "border", True]],
    "--craft-patreon-color": [[".craft-option.patron-recipe", "background-color", False]],
    "--craft-resource-bar-bg": [[".craft-resource .bar", "background", False]],
    "--craft-resource-bar-border-color": [[".craft-resource .bar", "border", True]],
    "--craft-resource-label-bg": [[".craft-resource .bar .count", "background", False]],
    "--model-container-bg": [[".modal-container", "background", False]],
    "--ui-border-color": [
        [".file-pane", "border", True],
        [".file-pane-file", "border", True],
        ["#chat-input", "border", True],
        ["#team_log_actual", "border", True],
        ["#team_players table", "border", True],
        ["#team_players td", "border-top", True],
        ["#team_players td", "border-bottom", True],
        ["#station-ui .bar", "border", True],
        ["#comms-text", "border", True],
        [".new-ui-container .bar", "border", True],
        [".craft-tip", "border", True],
        [".window section", "border", True]
    ],
    "--dark-bg": [[".dark", "background", False]],
    "--darker-bg": [[".darker", "background", False]],
    "--dark-links": [[".dark a, .darker a", "color", False]],
    "--recent-chat-bg": [["#chat.closed #chat-content p.recent", "background", False]],
    "--chat-autocomplete-active": [["#chat-autocomplete > p.active", "background", False]],
    "--chat-autocomplete-hover": [["#chat-autocomplete > p:hover", "background", False]],
    "--team-highlighted": [["#team_players .highlight-row", "border", True]],
    "--inventory-item-color": [[".item-ui-item", "border", True], [".item-ui-item", "background", False]],
    "--inventory-item-active": [[".item-ui-item.active", "border", True], [".item-ui-item.active", "background", False]],
    "--station-ui": [["#station-ui .bar .count", "background", False]]
}

cssappending = {
    "--btn-text-color": [["button, .btn", "color"]],
    "--btn-meme-text-color": [[".btn-meme", "color"]],
    "--btn-red-text-color": [[".btn-red", "color"]],
    "--btn-orange-text-color": [[".btn-orange", "color"]],
    "--btn-yellow-text-color": [[".btn-yellow", "color"]],
    "--btn-green-text-color": [[".btn-green", "color"]],
    "--btn-blue-text-color": [[".btn-blue", "color"]],
    "--btn-pink-text-color": [[".btn-pink", "color"]],
}


def patch(path):
    cssutils.ser.prefs.validate = False
    cssutils.log.setLevel(logging.FATAL)
    sheet = cssutils.parseFile(path + "index.css")

    variables = {}
    for rule in sheet:
        if rule.type == rule.STYLE_RULE:
            selector = rule.selectorText
            for varname, selectors in csskit.items():
                for (target_selector, prop, useRegex) in selectors:
                    if selector == target_selector and prop in rule.style:
                        if useRegex:
                            value = css_color_pattern.search(rule.style[prop]).group(1)
                            if varname in variables:
                                if variables[varname] != value:
                                    raise Exception(f"not matching: {variables[varname]} {value}")
                            variables[varname] = value
                            rule.style[prop] = css_color_pattern.sub(lambda match: f"var({varname})", rule.style[prop])
                        else:
                            value = rule.style[prop]
                            if varname in variables:
                                if variables[varname] != value:
                                    raise Exception(f"not matching: {variables[varname]} {value}")
                            variables[varname] = value
                            rule.style[prop] = f"var({varname})"
            for varname, selectors in cssappending.items():
                for (target_selector, prop) in selectors:
                    if selector == target_selector:
                        rule.style[prop] = f"var({varname})"

    print("done\n\n")
    for key in csskit:
        if key not in variables:
            print("missing", key)
    with open("InterstellarFoundational/modded.css", "r", encoding="utf-8") as css_file:
        css = sheet.cssText.decode("utf-8") + "\n" + css_file.read()
    with open(path + "index.css", "w", encoding="utf-8") as css_file:
        css_file.write(css)


if __name__ == "__main__":
    patch("../cache/prod_fetch/")
