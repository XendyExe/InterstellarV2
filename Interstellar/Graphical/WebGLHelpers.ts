import Interstellar from "../Interstellar";
import { WebGLZoneBackground } from "./WebGLZoneBackground";

export let gl: WebGL2RenderingContext;
export function helper_setwebgl(_gl:WebGL2RenderingContext) {
    gl = _gl;
}

export function createShader(type: number, src: string) {
    const s = gl.createShader(type)!!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw gl.getShaderInfoLog(s);
    }
    return s;
}

export function createProgram(vsSrc: string, fsSrc: string) {
    const p = gl.createProgram();
    gl.attachShader(p, createShader(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, createShader(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        throw gl.getProgramInfoLog(p);
    }
    return p;
}

export function debugCurrentAtlas() {
    if (!Interstellar.currentZone) return false;
    const bg = Interstellar.currentZone.subzones[Interstellar.currentZone.currentIndex]!!.background
    if (!(bg instanceof WebGLZoneBackground)) return false;
    debugTextureArray(bg.texture!!, bg.atlasSize.width, bg.atlasSize.height, bg.atlasLayerCount)
}

// @ts-ignore
window.debugCurrentAtlas = debugCurrentAtlas;

/**
 * Extracts and displays all layers from a WebGL2 texture array in a new tab
 * most claude code ever but im lazy
 * @param textureArray - The 2D texture array to debug
 * @param width - Width of each texture layer
 * @param height - Height of each texture layer
 * @param layerCount - Number of layers in the texture array
 * @param options - Optional configuration
 */
export function debugTextureArray(
  textureArray: WebGLTexture,
  width: number,
  height: number,
  layerCount: number,
  options: {
    outlineColor?: string;
    outlineWidth?: number;
    backgroundColor?: string;
    spacing?: number;
    title?: string;
  } = {}
): void {
  const {
    outlineColor = '#000000',
    outlineWidth = 2,
    backgroundColor = '#ffffff',
    spacing = 20,
    title = 'Texture Array Debug View'
  } = options;

  // Create framebuffer for reading texture layers
  const fb = gl.createFramebuffer();
  if (!fb) {
    console.error('Failed to create framebuffer');
    return;
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

  // Create new window with HTML structure
  const debugWindow = window.open('', '_blank');
  if (!debugWindow) {
    console.error('Failed to open debug window. Check if popups are blocked.');
    gl.deleteFramebuffer(fb);
    return;
  }

  debugWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            margin: 0;
            padding: ${spacing}px;
            background-color: ${backgroundColor};
            font-family: monospace;
          }
          .layer-container {
            margin-bottom: ${spacing}px;
          }
          .layer-title {
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: bold;
          }
          canvas {
            border: ${outlineWidth}px solid ${outlineColor};
            display: block;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Dimensions: ${width}x${height}, Layers: ${layerCount}</p>
        <div id="layers"></div>
      </body>
    </html>
  `);

  const layersContainer = debugWindow.document.getElementById('layers');
  if (!layersContainer) {
    gl.deleteFramebuffer(fb);
    return;
  }

  // Extract and display each layer
  const pixels = new Uint8Array(width * height * 4);

  for (let layer = 0; layer < layerCount; layer++) {
    // Attach this layer of the texture array to the framebuffer
    gl.framebufferTextureLayer(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      textureArray,
      0, // mip level
      layer
    );

    // Check framebuffer status
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`Framebuffer incomplete for layer ${layer}: ${status}`);
      continue;
    }

    // Read pixels from this layer
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Create canvas in the debug window
    const canvas = debugWindow.document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error(`Failed to get 2D context for layer ${layer}`);
      continue;
    }

    // Create ImageData and put pixels
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    // Add to document
    const container = debugWindow.document.createElement('div');
    container.className = 'layer-container';
    
    const titleDiv = debugWindow.document.createElement('div');
    titleDiv.className = 'layer-title';
    titleDiv.textContent = `Layer ${layer}`;
    
    container.appendChild(titleDiv);
    container.appendChild(canvas);
    layersContainer.appendChild(container);
  }

  // Cleanup
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb);
}