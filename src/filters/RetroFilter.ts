import { Filter, GlProgram } from 'pixi.js'

const vert = `
attribute vec2 aPosition;
varying vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main() {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`

const frag = `
varying vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uScanlineStrength;
uniform float uVignetteStrength;

void main() {
  vec4 color = texture2D(uTexture, vTextureCoord);

  // スキャンライン（uTime で微小にちらつかせる）
  float scanline = sin(vTextureCoord.y * 320.0 + uTime * 0.5) * 0.5 + 0.5;
  color.rgb -= (1.0 - scanline) * uScanlineStrength;

  // ビネット
  vec2 uv = vTextureCoord * 2.0 - 1.0;
  float vignette = 1.0 - dot(uv, uv) * uVignetteStrength;
  color.rgb *= clamp(vignette, 0.0, 1.0);

  gl_FragColor = color;
}
`

export class RetroFilter extends Filter {
  constructor() {
    const glProgram = GlProgram.from({ vertex: vert, fragment: frag })
    super({
      glProgram,
      resources: {
        retroUniforms: {
          uTime: { value: 0, type: 'f32' },
          uScanlineStrength: { value: 0.12, type: 'f32' },
          uVignetteStrength: { value: 0.38, type: 'f32' },
        },
      },
    })
  }

  tick(dt: number): void {
    this.resources.retroUniforms.uniforms.uTime += dt * 0.001
  }
}
