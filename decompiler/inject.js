
document.cookie = "anon_key=4Iy46Y9B0OnzLBAa_JCwWS3e; notice_version=16";
window.start_decompile = () => {
    let code = {};
    let missing = 0;
    if (!window.drednotCode) return setTimeout(start_decompile, 1000);
    console.log(window.drednotCode);
    console.log("drednotcodelength", window.drednotCode.length);
    window.drednotCode.forEach((base_function, i) => {
        let func = base_function;
        if (window.reqcode[i]) {
            func = window.reqcode[i];
        }
        if (!func) {
            code[i] = "MISSING_CODE";
            console.log("MISSING CODE:", i);
            missing ++;
            return;
        }
        console.log(i);
        code[i] = func.toString();
    })
    console.log(Object.keys(code).length, code);
    console.log(missing);
    let crawler_result = {};
    const match = document.getElementById("drednot_script").innerHTML.match(/;r\((\d+)\)/m);
    if (!match) return setTimeout(start_decompile, 100);
    const start = Number.parseInt(match[1]);
    if (!code[start]) return setTimeout(start_decompile, 100);
    function crawl(i, func_string) {
        const imports = func_string.matchAll(/require\((\d+)\)/gm);
        crawler_result[i] = func_string;
        for (let match of imports) {
            let req = Number.parseInt(match[1]);
            if (!crawler_result[req]) {
                let target = code[req];
                if (!target) throw "the fuck";
                crawl(req, target);
            }
        }
    }

    crawl(start, code[start]);
    interstellar_decompile_result(JSON.stringify(code));
    console.log("beamed");
}

(function() {
    new MutationObserver((_, observer) => {
        const scriptTag = document.querySelectorAll('script');
        let scriptTagsArray = Array.from(scriptTag);
        scriptTagsArray.forEach(function(tag) {
            if (tag.innerText.includes("test.drednot.io")) {
                tag.innerHTML = "window.start_decompile=" + start_decompile.toString() + ";window.start_decompile();" + tag.innerText.replace("function r(n) {", "function asyuidfghbaweulifguifhwali(n) {").replace(/let m = \[\];/g, `window.reqcode={};window.m = [];window.drednotExports = m;function r(n) {if (m[n] == null) {m[n] = {};window.reqcode[n]=c[n].toString();c[n](r,m[n]);} return m[n];}`)
                                             .replace("let c=r.c=", `let c=r.c=window.drednotCode=`);
                tag.id = "drednot_script";
                window.internals = null;
                observer.disconnect();
            }
        });
    }).observe(document.documentElement, { childList: true, subtree: true });
})();