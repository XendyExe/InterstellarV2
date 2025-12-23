import json
import os
import re
import shutil
import time
import dredkit

import requests
from bs4 import BeautifulSoup, Formatter
from playwright.sync_api import sync_playwright

import_regex = re.compile(r"const (.*?) ?= ?require\((\d+)\);", re.RegexFlag.MULTILINE)
require_regex = re.compile(r"require\((\d+)\)", re.RegexFlag.MULTILINE)
id_regex = re.compile(r"exports\.id ?= ?(\d+);?", re.RegexFlag.MULTILINE)
zero_context_function_call_regex = re.compile(r"\(\s*0\s*,\s*([A-Za-z0-9_$.]+)\s*\)\s*\(", re.RegexFlag.MULTILINE)

def decompile_drednot(name, path):
    drednot_index_html = requests.get(path).text
    code: dict = json.loads(get_drednot_internals(path))

    drednot_index_html = drednot_index_html[drednot_index_html.find("<!doctype html>"):]
    soup: BeautifulSoup = BeautifulSoup(drednot_index_html, 'html.parser')

    # Read styles
    styles = soup.find_all('style')
    drednot_style = ""
    first = True
    for style in styles:
        drednot_style += str(style)[len("<style>"):-len("</style>")]
        if first:
            style.clear()
            style.string = "%%css%%"
        else:
            style.decompose()

    # Read scripts
    scripts = soup.find_all('script')
    index_script = None
    for script in scripts:
        if "test.drednot.io" in script.string:
            index_script = script.string
            script.decompose()
        else:
            script.decompose()
    if not index_script:
        raise ValueError("Failed to find drednot script!")

    start_list_index = index_script.find("=[") + 2
    end_list_index = index_script.rfind("]")
    index_script = index_script[:start_list_index] + "/* Internal */" + index_script[end_list_index:]
    drednot_html = soup.prettify(None, Formatter(Formatter.HTML, indent=4))
    if not os.path.isdir("cache"):
        os.mkdir("cache")
    if not os.path.isdir(f"cache/{name}"):
        os.mkdir(f"cache/{name}")
    if not os.path.isdir(f"cache/{name}/js"):
        os.mkdir(f"cache/{name}/js")
    with open(f"cache/{name}/index.html", "w", encoding="utf-8") as write:
        write.write(drednot_html)
    with open(f"cache/{name}/index.css", "w", encoding="utf-8") as write:
        write.write(drednot_style)
    shutil.rmtree(f"cache/{name}/js")
    os.mkdir(f"cache/{name}/js")

    has_matched = {}
    for key in dredkit.source_map:
        has_matched[key] = False

    tree = {}
    for index, func in code.items():
        func: str = func[func.find("{") + 1:func.rfind("}")].removeprefix("\"use strict\";")
        index = int(index)

        script_name = f"script_{index}"
        for key, matchers in dredkit.source_map.items():
            matched = True
            for matcher in matchers:
                matched &= matcher in func
            if matched:
                if has_matched[key]:
                    raise Exception(f"Multiple matches found for {key}")
                else:
                    has_matched[key] = True
                    script_name = key
                    break
        code[str(index)] = func
        tree[index] = script_name

    for key, matched in has_matched.items():
        if not matched:
            print(f"Failed to find match for {key}")

    def replace_require(match):
        i = int(match.group(1))
        if i not in tree:
            print(match)
            return f"require('UNKNOWN_{i}')"
        replacement_str = tree[i]
        return f'require("{replacement_str}")'
    def replace_id(match):
        i = int(match.group(1))
        if i not in tree:
            print(match)
            return f'exports.id = \"UNKNOWN\";'
        replacement_str = tree[i]
        return f'exports.id="{replacement_str}";'
    def simplify_function_calls(match):
        return f" {match[1]}("

    for index, func in code.items():
        index = int(index)
        script_name = tree[index]
        func = require_regex.sub(replace_require, func)
        func = id_regex.sub(replace_id, func)
        func = zero_context_function_call_regex.sub(simplify_function_calls, func)
        if script_name == dredkit.create_game_js:
            func = func.replace("launch_background_workers();", "launch_background_workers;")
        elif script_name == dredkit.asset_table:
            pass

        with open(f"cache/{name}/js/{script_name}.js", "w", encoding="utf-8") as write:
            write.write(prettify_js(func))
    with open(f"cache/{name}/index.js", "w", encoding="utf-8") as write:
        write.write(prettify_js(index_script))
    json.dump(tree, open(f"cache/{name}/tree.json", "w"), indent=4)


def get_drednot_internals(path) -> str:
    if os.path.isdir("./BrowserPersistentData"):
        shutil.rmtree("./BrowserPersistentData")
    with sync_playwright() as pw:
        EXTENSION_PATH = os.path.abspath("./decompiler")
        print(f"Loading extension from {EXTENSION_PATH}")
        context = pw.chromium.launch_persistent_context(
            os.path.abspath("./BrowserPersistentData"),
            headless=False,
            args=[
                f'--disable-extensions-except={EXTENSION_PATH}',
                f'--load-extension={EXTENSION_PATH}',
                '--no-sandbox',
                '--no-zygote',
                '--disable-infobars'
            ]
        )
        page = context.new_page()

        result = None

        def send_result(r):
            nonlocal result
            print("Received result!")
            result = r

        page.expose_function("interstellar_decompile_result", send_result)
        page.goto(path)
        print("Waiting for result")

        max_wait = 5
        elapsed = 0
        while not result:
            while not result and elapsed < max_wait:
                time.sleep(0.1)
                elapsed += 0.1
                page.evaluate("() => {}")  # Keep page context alive
            page.reload()
            elapsed = 0
        context.close()
        return result


import jsbeautifier


def prettify_js(js_code: str) -> str:
    """Format/prettify JavaScript code."""
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

if __name__ == "__main__":
    decompile_drednot("prod_fetch", "https://drednot.io/")