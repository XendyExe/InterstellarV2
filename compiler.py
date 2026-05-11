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

require_regex = re.compile(r"require\(\"([@a-zA-Z_0-9]+)\"\)", re.RegexFlag.MULTILINE)
commonjs_require_regex = re.compile(r"require\(\"(.*?)\"\)", re.RegexFlag.MULTILINE)
id_regex = re.compile(r"exports\.id ?= ?\"(.+)\";?", re.RegexFlag.MULTILINE)

OBFUSCATE = False
base_dir = Path(__file__).parent


def compile_drednot(name, path, forceObfuscate=False):
    global OBFUSCATE
    if forceObfuscate:
        OBFUSCATE = True
    with open(base_dir / path / "index.html", "r", encoding="utf-8") as reader:
        index_html = reader.read()
    with open(base_dir / path / "index.css", "r", encoding="utf-8") as reader:
        index_css = reader.read()
    with open(base_dir / "InterstellarFoundational/base_index.js", "r", encoding="utf-8") as reader:
        index_js = reader.read()

    ordered_names = []
    ordered_scripts = []

    for entry in os.listdir(base_dir / path / "js/"):
        full_path = os.path.join(base_dir / path / "js/", entry)
        js_name = entry.removesuffix(".js")
        if js_name == "preact":
            with open(base_dir / "InterstellarFoundational/preact.js", "r", encoding="utf-8") as reader:
                js = reader.read()
                ordered_names.append(js_name)
                ordered_scripts.append(js)
        else:
            with open(full_path, "r", encoding="utf-8") as reader:
                js = reader.read()
                ordered_names.append(js_name)
                ordered_scripts.append(js)
    with open(base_dir / "InterstellarInternals/build/interstellar_internals.js", "r", encoding="utf-8") as reader:
        ordered_names.append("@InterstellarInternals")
        ordered_scripts.append(reader.read())
    asset_tree = {}
    folder = base_dir / "Assets/"
    absolute_asset_path = str(folder.absolute())
    if absolute_asset_path[-1] != "/":
        absolute_asset_path += "/"
    for file in folder.rglob('*'):
        if file.is_file():
            file_path = str(file).replace("\\", "/")
            key = file_path.removeprefix(absolute_asset_path)
            hasher = hashlib.new("MD5")
            with open(file.resolve(), 'rb') as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    hasher.update(chunk)
            asset_tree[key] = hasher.hexdigest()
    if os.path.exists(base_dir / "cache/tscompile"):
        shutil.rmtree(base_dir / "cache/tscompile")
    os.mkdir(base_dir / "cache/tscompile")
    if os.name == "nt":
        os.system(f"cd {(base_dir / "Interstellar").absolute()} && npx tsc -b")
    else:
        subprocess.call(f"cd {(base_dir / "Interstellar").absolute()}; npx tsc -b", shell=True, executable="/bin/bash")
    folder = base_dir / "cache/tscompile"
    for file in folder.rglob('*'):
        if file.is_file() and file.name.endswith(".js"):
            def commonjs_require_replacer(match):
                p = match[1]
                actual_path = file.parent.joinpath(p)
                js_name = actual_path.name.removesuffix(".js")
                # print(f"    Converting CommonJS import {p} -> {js_name}")
                return f'require("{js_name}")'
            js_name = file.name.removesuffix(".js")
            # print(f"Loading extension js // {js_name}")
            with open(file.joinpath(), "r", encoding="utf-8") as reader:
                js = reader.read().removeprefix('"use strict";')
                js = commonjs_require_regex.sub(commonjs_require_replacer, js)
                if js_name == "GeneratedAssetTree":
                    js = js.replace("exports.GeneratedAssetTree = {};", "exports.GeneratedAssetTree = " + json.dumps(asset_tree) + ";") \
                            .replace("-514.201129", str(time.time()))
                    # print("    Injected asset tree")
                ordered_names.append(js_name)
                ordered_scripts.append(js)


    merged = list(zip(ordered_names, ordered_scripts))
    random.shuffle(merged)
    ordered_names, ordered_scripts = zip(*merged)
    ordered_names = list(ordered_names)
    ordered_scripts = list(ordered_scripts)


    def require_replacer(match):
        return f'require({ordered_names.index(match[1]) if match[1] in ordered_names else -1}) /* {match[1]} */'

    def id_replacer(match):
        return f'exports.id = {ordered_names.index(match[1]) if match[1] in ordered_names else -1}; /* {match[1]} */'

    for i in range(0, len(ordered_scripts)):
        ordered_scripts[i] = require_regex.sub(require_replacer, ordered_scripts[i])
        ordered_scripts[i] = id_regex.sub(id_replacer, ordered_scripts[i])
        ordered_scripts[i] = "function(require, exports, interstellar) /* " + ordered_names[i] + " */{\"use strict\";" + \
                             ordered_scripts[i] + "}"
    libs = ""

    internal = (",".join(ordered_scripts))
    stellar_index = ordered_names.index('Interstellar')
    index_js = (index_js.replace("/* Internal */", internal)
                .replace("/* Start */", f"r({ordered_names.index('InitGame')})")
                .replace("/* InitInterstellar */", f"r({stellar_index});m.interstellar=m[{stellar_index}].default;m.interstellar.init();")
                .replace("/* Libs */", libs)
                )
    build_path = base_dir / f"cache/{name}_build/"
    if not os.path.isdir(build_path):
        os.mkdir(build_path)

    non_obfuscated_path = os.path.abspath(base_dir / build_path / "index.js")
    obfuscated_path = os.path.abspath(base_dir / build_path / "index_obf.js")
    if OBFUSCATE:
        with open(non_obfuscated_path, "w", encoding="utf-8") as writer:
            writer.write(index_js)
        os.system(
            f"uglifyjs --mangle --compress --timings {non_obfuscated_path} -o {obfuscated_path}"
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
    index_js = index_js.encode('utf-8')
    js_length = len(index_js).to_bytes(4, byteorder="little")
    
    with open(base_dir / "InterstellarInternals/build/interstellar_internals.wasm", "rb") as reader:
        wasm = reader.read()

    build_result = build_length + js_length + build_result + index_js+ wasm


    with open(base_dir / build_path / "index.game", "wb") as writer:
        writer.write(build_result)
    if forceObfuscate:
        OBFUSCATE = False
    return build_result


if __name__ == "__main__":
    compile_drednot("prod")
