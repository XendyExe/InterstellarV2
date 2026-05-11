wasm-pack build --target web
npx esbuild pkg/worklet.js --bundle --outfile=../Assets/music/worklet.js
npx uglify-js --compress --mangle --output ../Assets/music/worklet.js -- ../Assets/music/worklet.js
cp pkg/InterstellarMusic_bg.wasm ../Assets/music/music.wasm