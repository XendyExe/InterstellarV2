import json
import os
import random
import re
import shutil
import subprocess
import hashlib
import time
from pathlib import Path
from minify_html import minify_html

require_regex = re.compile(r"require\(\"([a-zA-Z_0-9]+)\"\)", re.RegexFlag.MULTILINE)
commonjs_require_regex = re.compile(r"require\(\"(.*?)\"\)", re.RegexFlag.MULTILINE)
id_regex = re.compile(r"exports\.id ?= ?\"(.+)\";?", re.RegexFlag.MULTILINE)
pixi_regex = re.compile(r"const\s+?(.*?)\s*?=\s*?require\(\"pixi\.js\"\);", re.RegexFlag.MULTILINE)
pixi_filters_regex = re.compile(r"const\s+?(.*?)\s*?=\s*?require\(\"pixi-filters\"\);", re.RegexFlag.MULTILINE)

OBFUSCATE = False

def compile_drednot(name, forceObfuscate=False):
    global OBFUSCATE
    if forceObfuscate:
        OBFUSCATE = True
    path = "cache/prod/"
    with open(path + "index.html", "r", encoding="utf-8") as reader:
        index_html = reader.read()
    with open(path + "index.css", "r", encoding="utf-8") as reader:
        index_css = reader.read()
    with open("InterstellarFoundational/base_index.js", "r", encoding="utf-8") as reader:
        index_js = reader.read()

    ordered_names = []
    ordered_scripts = []

    for entry in os.listdir(path + "js/"):
        full_path = os.path.join(path + "js/", entry)
        js_name = entry.removesuffix(".js")
        print(f"Loading internal js // {js_name}")
        with open(full_path, "r", encoding="utf-8") as reader:
            js = reader.read()
            ordered_names.append(js_name)
            ordered_scripts.append(js)
    print("Generating asset tree")
    asset_tree = {}
    folder = Path("Assets")
    for file in folder.rglob('*'):
        if file.is_file():
            key = str(file).replace("\\", "/").removeprefix("Assets/")
            hasher = hashlib.new("MD5")
            with open(file.resolve(), 'rb') as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    hasher.update(chunk)
            asset_tree[key] = hasher.hexdigest()
    if os.path.exists("cache/tscompile"):
        shutil.rmtree("cache/tscompile")
    os.mkdir("cache/tscompile")
    print("Compiling Interstellar")
    if os.name == "nt":
        os.system("cd Interstellar && npx tsc -b")
    else:
        subprocess.call("cd Interstellar; npx tsc -b", shell=True, executable="/bin/zsh")
    print("Post processing Interstellar")
    folder = Path("cache/tscompile")
    for file in folder.rglob('*'):
        if file.is_file() and file.name.endswith(".js"):
            def commonjs_require_replacer(match):
                p = match[1]
                actual_path = file.parent.joinpath(p)
                js_name = actual_path.name.removesuffix(".js")
                print(f"    Converting CommonJS import {p} -> {js_name}")
                return f'require("{js_name}")'
            js_name = file.name.removesuffix(".js")
            print(f"Loading extension js // {js_name}")
            with open(file.joinpath(), "r", encoding="utf-8") as reader:
                js = reader.read().removeprefix('"use strict";')

                # Fix PIXI imports
                result = pixi_regex.search(js)
                if result:
                    pixi_name = result.group(1)
                    js = js[:result.start()] + js[result.end():]
                    js = js.replace(pixi_name, "PIXI")
                    print("    Fixed PIXI import")
                result = pixi_filters_regex.search(js)
                if result:
                    pixi_name = result.group(1)
                    js = js[:result.start()] + js[result.end():]
                    js = js.replace(pixi_name, "PIXI.filters")
                    print("    Fixed PIXI filters import")
                js = commonjs_require_regex.sub(commonjs_require_replacer, js)
                if js_name == "GeneratedAssetTree":
                    js = js.replace("exports.GeneratedAssetTree = {};", "exports.GeneratedAssetTree = " + json.dumps(asset_tree) + ";") \
                            .replace("-514.201129", str(time.time()))
                    print("    Injected asset tree")
                ordered_names.append(js_name)
                ordered_scripts.append(js)


    merged = list(zip(ordered_names, ordered_scripts))
    random.shuffle(merged)
    ordered_names, ordered_scripts = zip(*merged)
    ordered_names = list(ordered_names)
    ordered_scripts = list(ordered_scripts)


    def require_replacer(match):
        print(f"          Replacing {match[1]} -> {ordered_names.index(match[1]) if match[1] in ordered_names else -1}")
        return f'require({ordered_names.index(match[1]) if match[1] in ordered_names else -1}) /* {match[1]} */'

    def id_replacer(match):
        return f'exports.id = {ordered_names.index(match[1]) if match[1] in ordered_names else -1}; /* {match[1]} */'

    print("Building...")
    for i in range(0, len(ordered_scripts)):
        print(f"    Building {ordered_names[i]} (i={i})")
        ordered_scripts[i] = require_regex.sub(require_replacer, ordered_scripts[i])
        ordered_scripts[i] = id_regex.sub(id_replacer, ordered_scripts[i])
        ordered_scripts[i] = "function(require, exports, interstellar) /* " + ordered_names[i] + " */{\"use strict\";" + \
                             ordered_scripts[i] + "}"

    print("Adding Libs")
    libs = ""
    with open("InterstellarFoundational/libs/pixi.js", "r") as reader:
        libs += reader.read() + "\n"
    with open("InterstellarFoundational/libs/pixi-filters.js", "r") as reader:
        libs += reader.read() + "\n"

    internal = (",".join(ordered_scripts))
    stellar_index = ordered_names.index('Interstellar')
    index_js = (index_js.replace("/* Internal */", internal)
                .replace("/* Start */", f"r({ordered_names.index('InitGame')})")
                .replace("/* InitInterstellar */", f"r({stellar_index});m.interstellar=m[{stellar_index}].default;m.interstellar.init();")
                .replace("/* Libs */", libs)
                )
    build_path = f"cache/{name}_build/"
    if not os.path.isdir(build_path):
        os.mkdir(build_path)

    non_obfuscated_path = os.path.abspath(build_path + "index.js")
    obfuscated_path = os.path.abspath(build_path + "index_obf.js")
    if OBFUSCATE:
        with open(non_obfuscated_path, "w", encoding="utf-8") as writer:
            writer.write(index_js)
        os.system(
            f"uglifyjs --mangle --compress --timings {non_obfuscated_path} -o {obfuscated_path} "
        )
        with open(obfuscated_path, "r", encoding="utf-8") as reader:
            index_js = reader.read()
    build_result = index_html.replace("%%css%%", index_css)
    build_result = minify_html.minify(
        build_result,
        keep_closing_tags=False,
        minify_css=True,
        minify_js=False
    ).encode("utf-8")

    build_length = len(build_result).to_bytes(4, byteorder="little")

    build_result = build_length + build_result + index_js.encode("utf-8")


    with open(build_path + "index.game", "wb") as writer:
        writer.write(build_result)
    if forceObfuscate:
        OBFUSCATE = False
    return build_result


if __name__ == "__main__":
    compile_drednot("prod")
