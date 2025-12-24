from patcher import patch_html, patch_modfiledatabase
from patcher import patch_css
from patcher import patch_texts
from patcher import patch_webgl
from patcher import patch_initgame
from patcher import patch_settings
from patcher import patch_uievents
from patcher import patch_gameclient
from patcher import patch_assettable
from patcher import patch_clientsocket
from patcher import patch_wasmbindgen
from patcher import patch_htmluifunctions


def patchall(path, game_version):
    patch_html.patch(path, game_version)
    patch_gameclient.patch(path)
    patch_webgl.patch(path)
    patch_wasmbindgen.patch(path)
    patch_assettable.patch(path)
    patch_clientsocket.patch(path)
    patch_texts.patch(path)
    patch_settings.patch(path)
    patch_css.patch(path)
    patch_initgame.patch(path)
    patch_uievents.patch(path)
    patch_htmluifunctions.patch(path)
    patch_modfiledatabase.patch(path)