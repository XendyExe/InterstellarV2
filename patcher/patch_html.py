from pathlib import Path

from bs4 import BeautifulSoup, Formatter
base_dir = Path(__file__).parent.parent

def patch(path, gameVersion):
    with open(base_dir / path / "index.html", "r+", encoding="utf-8") as html:
        soup = BeautifulSoup(html.read(), features="html.parser")
    soup.head.title.string = "Interstellar"
    soup.select("#top-bar > h1")[0].string = "Interstellar"
    soup.select("#bottom-bar")[0].string = f"""
        <a href="/rules.html" target="_blank">Rules</a> • 
        <a href="/terms.html" target="_blank">Terms</a> • 
        <a href="/privacy.html" target="_blank">Privacy</a>
        •&nbsp;© 2025 Adam Coggeshall (<a href="/credits.txt" target="_blank">Credits</a>)&nbsp;•
        <a id="debugMenuOpener">{gameVersion}</a>
    """

    string_html = soup.prettify(None, Formatter(Formatter.HTML))
    with open(base_dir / path / "index.html", "w", encoding="utf-8") as html:
        html.write(string_html)
