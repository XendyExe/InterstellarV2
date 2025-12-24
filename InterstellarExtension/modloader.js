const DEV_SERVER_PROD = "http://127.0.0.1:9000/prod/index.html";
const DEV_SERVER_TEST = "http://127.0.0.1:9000/test/index.html";
const PRODUCTION_URL = "https://interstellarassets.xendyexe.workers.dev/prod.game";
const TEST_URL = "https://interstellarassets.xendyexe.workers.dev/test.game";

(async () => {
    try {
        const USE_DEV = localStorage.getItem("interstellarDEV") === "true";
        localStorage.setItem("interstellarDEV", USE_DEV);
        
        const test = location.hostname === "test.drednot.io";
        console.log("Running on test:", test);
        const url = USE_DEV ? (test ? DEV_SERVER_TEST : DEV_SERVER_PROD) : (test ? TEST_URL : PRODUCTION_URL);
        
        const resp = await fetch(url, {
            cache: "no-store"
        });
        
        if (!resp.ok) {
            throw new Error(`Server responded with ${resp.status} ${resp.statusText}`);
        }
        const buffer = await resp.arrayBuffer();
        const view = new DataView(buffer);
        const decoder = new TextDecoder("utf-8");

        const htmlLength = view.getUint32(0, true);
        const html = decoder.decode(new Uint8Array(buffer, 4, htmlLength));
        const js = decoder.decode(new Uint8Array(buffer, 4 + htmlLength));
        

        document.documentElement.innerHTML = html;
        const script = document.createElement("script")
        script.innerHTML = js;
        document.body.appendChild(script);
    } catch (e) {
        showError(e);
    }
})();
function showError(e) {
    const msg = `
        <h1>Failed to load Interstellar</h1>
        <p><strong>Error:</strong> ${e.message}</p>
        <p>Please DM Xendy at xendyos with a screenshot of your console if you believe this to be incorrect.</p>
        <p>Click <a href="/" id="vanillalink">here</a> to be sent to vanilla</p>
    `;

    document.documentElement.innerHTML = `
        <head>
            <title>Error</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap" rel="stylesheet">
            <style>
                html {font-family: Lexend, sans-serif;}
                body {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    overflow: hidden;
                    height: 100%;
                    justify-content: center;
                    align-items: center;
                    background: #111827;
                    color:white;
                    margin: 0;
                }
                a:link { color: #c2f4ff; }
                a:visited { color: #c2f4ff; }
                a:hover { color: #98c2cb; }
                a:active { color: #c2f4ff; }
                .main {
                    background: #1f2937;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    border-radius: 4px;
                    max-width: 90%;
                }
                pre {
                    overflow-x: auto;
                    max-width: 100%;
                }
            </style>
        </head>
        <body>
            <div class="main">
                ${msg}
                <pre>${e.stack || e}</pre>
                <div><strong>Make sure this is unchecked unless you know what you are doing (dev server):<strong> <input type=checkbox id="devservercheckbox"></div>
            </div>
        </body>
    `;

    const c = document.getElementById("devservercheckbox");
    c.checked = localStorage.getItem("interstellarDEV") === "true";
    c.onchange = ()=> {
        localStorage.setItem("interstellarDEV", c.checked)
    }
    

    const link = document.getElementById("vanillalink");
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const current = window.location;
        const target = new URL(link.href, window.location.origin);
        target.search = current.search;
        target.hash = current.hash;
        localStorage.setItem("interstellarLoadVanilla", "true");
        window.location.href = target.toString();
    });
}