import { Filter, GlProgram } from 'pixi.js'

const vert = `
in vec2 aPosition;
out vec2 vUv;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

void main() {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  gl_Position = vec4((position / uOutputTexture.xy) * 2.0 - 1.0, 0.0, 1.0);
  vUv = aPosition;
}
`

const frag = `
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uScanlineStrength;
uniform float uVignetteStrength;

void main() {
  vec4 color = texture(uTexture, vUv);

  // スキャンライン（uTime で微小にちらつかせる）
  float scanline = sin(vUv.y * 320.0 + uTime * 0.5) * 0.5 + 0.5;
  color.rgb -= (1.0 - scanline) * uScanlineStrength;

  // ビネット
  vec2 uv = vUv * 2.0 - 1.0;
  float vignette = 1.0 - dot(uv, uv) * uVignetteStrength;
  color.rgb *= clamp(vignette, 0.0, 1.0);

  fragColor = color;
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
