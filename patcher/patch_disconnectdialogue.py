from pathlib import Path

from .. import dredkit

base_dir = Path(__file__).parent.parent

def patch(path):
    with open(base_dir / path / f"js/{dredkit.disconnectdialogue}.js", "r", encoding="utf-8") as js_file:
        js = js_file.read()
    js = js.replace("The client's version does not match the server's. Please refresh.", "The client's version does not match the server's. Please refresh. Note: You are using Interstellar, which may has not updated yet. Please be patient and check the #webhook-notifs channel in the interstellar discord to see update progress. If you see nothing there, autoupdate may be broken and you should disable the extension temporarily and ping @xendyos on discord.")
    with open(base_dir / path / f"js/{dredkit.disconnectdialogue}.js", "w", encoding="utf-8") as js_file:
        js_file.write(dredkit.prettify_js(js))
#