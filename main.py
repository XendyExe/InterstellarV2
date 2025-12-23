import asyncio
import hashlib
import json
import os.path
import shutil
import sys
import time
from io import BytesIO
from pathlib import Path

import aiohttp

import compiler
import aiohttp_cors
from aiohttp import web, MultipartWriter

import patchall

lastBuildTime = 0


def directory_changed_since(path: str, timestamp: float) -> bool:
    for root, _, files in os.walk(path):
        for name in files:
            full_path = os.path.join(root, name)
            try:
                if os.path.getmtime(full_path) > timestamp:
                    return True
            except FileNotFoundError:
                continue
    return False


def build_dred():
    global lastBuildTime
    if not directory_changed_since("Assets", lastBuildTime) and \
            not directory_changed_since("Interstellar", lastBuildTime) and \
            not os.path.getmtime(os.path.abspath("InterstellarFoundational/modded.css")) > lastBuildTime:
        print("Do not need to build, is most updated!")
        with open("cache/prod_build/index.game", "rb") as reader:
            return reader.read()
    print("\n\n\n\n\n")
    with open("InterstellarFoundational/buildcount.txt", "r") as reader:
        buildCount = int(reader.read())
        buildCount += 1
    with open("InterstellarFoundational/buildcount.txt", "w") as writer:
        writer.write(str(buildCount))
    lastBuildTime = time.time()
    start_time = time.time()
    # decompiler.decompile_drednot("prod_fetch", "https://drednot.io/")
    if os.path.isdir("cache/prod"):
        shutil.rmtree("cache/prod")
    shutil.copytree("cache/prod_fetch", "cache/prod")

    path = "cache/prod/"
    GAME_VERSION = f"Interstellar (Starbright) // v2.0.0.{buildCount}"
    patchall.patchall(path, GAME_VERSION)

    result = compiler.compile_drednot("prod")
    print(f"Finished build in {time.time() - start_time} seconds")
    return result


base_folder = Path("Assets").resolve()


def is_safe_path(path: str, base: Path = base_folder) -> bool:
    target = (base / path).resolve()
    return base in target.parents or target == base


async def asset_update(request: aiohttp.web.Request):
    data = await request.json()
    print(data)
    mpwriter = MultipartWriter('form-data')
    files = {}
    manifest = {}
    for path in data:
        rpath = "./Assets/" + path
        if is_safe_path(rpath):
            with open(rpath, "rb") as r:
                d = r.read()
                files[path] = d
                manifest[path] = hashlib.md5(d).hexdigest()
        else:
            return web.Response(status=401)
    part = mpwriter.append(BytesIO(json.dumps(manifest).encode("utf-8")))
    part.set_content_disposition('form-data', name="INTERSTELLAR_ASSET_MANIFEST",
                                 filename="INTERSTELLAR_ASSET_MANIFEST")
    part.headers['Content-Type'] = 'application/json'
    for path, data in files.items():
        part = mpwriter.append(BytesIO(data))
        part.set_content_disposition('form-data', name=path, filename=path)
        part.headers['Content-Type'] = 'application/octet-stream'

    return web.Response(body=mpwriter, headers={'Content-Type': mpwriter.content_type})


async def getGame(request):
    return web.Response(body=build_dred())


app = web.Application()
app.add_routes([
    web.get('/prod/index.html', getGame),
    web.get('/test/index.html', getGame),
    web.post('/assets', asset_update)
])
if __name__ == '__main__':
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*"
        )
    })

    for route in list(app.router.routes()):
        cors.add(route)
    print("Interstellar Server has started.")
    web.run_app(app, port=9000, print=False)
