import {
  Color, DepthTexture, Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry, Scene,
  ShaderMaterial, UnsignedIntType, Vector2, WebGLRenderTarget,
} from 'three';
import type { PerspectiveCamera, WebGLRenderer } from 'three';
import { RENDER_FAR, RENDER_NEAR } from '../camera/profiles';
import type { StreamProfile } from '../camera/profiles';

const vertexShader = `
  varying vec2 imageUv;
  void main() {
    imageUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const depthFunctions = `
  uniform sampler2D sensorTexture;
  uniform float clipNear;
  uniform float clipFar;
  uniform vec2 validRange;

  float metricDepth(vec2 uv) {
    float z = texture2D(sensorTexture, uv).x;
    if (z >= 1.0) return -1.0;
    return (clipNear * clipFar) / (clipFar - (clipFar - clipNear) * z);
  }

  bool validDepth(float d) {
    return d >= validRange.x && d <= validRange.y;
  }
`;

function depthUniforms(depthTexture: DepthTexture) {
  return {
    sensorTexture: { value: depthTexture },
    clipNear: { value: RENDER_NEAR },
    clipFar: { value: RENDER_FAR },
    validRange: { value: new Vector2() },
  };
}

const PALETTE = ['#f5cb62', '#7dbc78', '#2d9c9c', '#426ba1', '#51497f'];
export const DEPTH_GRADIENT = `linear-gradient(90deg, ${PALETTE.join(', ')})`;

export function createSensorViews(renderer: WebGLRenderer) {
  const rgbTarget = new WebGLRenderTarget(1, 1);
  const depthTarget = new WebGLRenderTarget(1, 1);
  const depthTexture = new DepthTexture(1, 1, UnsignedIntType);
  depthTarget.depthTexture = depthTexture;
  const sampleTarget = new WebGLRenderTarget(1, 1, { depthBuffer: false });

  const uniforms = depthUniforms(depthTexture);

  const rgbMaterial = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: { sensorTexture: { value: rgbTarget.texture } },
    vertexShader,
    fragmentShader: `
      varying vec2 imageUv;
      uniform sampler2D sensorTexture;
      void main() {
        gl_FragColor = texture2D(sensorTexture, imageUv);
        #include <colorspace_fragment>
      }
    `,
  });
  const depthMaterial = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: { ...uniforms, palette: { value: PALETTE.map(color => new Color(color)) } },
    vertexShader,
    fragmentShader: `
      varying vec2 imageUv;
      uniform vec3 palette[5];
      ${depthFunctions}
      void main() {
        float d = metricDepth(imageUv);
        vec3 color = vec3(0.010, 0.016, 0.019);
        if (validDepth(d)) {
          float t = 4.0 * clamp((d - validRange.x) / (validRange.y - validRange.x), 0.0, 1.0);
          for (int i = 0; i < 4; i++) {
            if (t >= float(i)) color = mix(palette[i], palette[i + 1], clamp(t - float(i), 0.0, 1.0));
          }
        }
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const sampleMaterial = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: { ...uniforms, sampleUv: { value: new Vector2() } },
    vertexShader,
    fragmentShader: `
      uniform vec2 sampleUv;
      ${depthFunctions}
      void main() {
        float d = metricDepth(sampleUv);
        if (!validDepth(d)) {
          gl_FragColor = vec4(0.0);
          return;
        }
        float mm = floor(1000.0 * d + 0.5);
        gl_FragColor = vec4(floor(mm / 65536.0), mod(floor(mm / 256.0), 256.0), mod(mm, 256.0), 255.0) / 255.0;
      }
    `,
  });

  const screen = new Scene();
  const screenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new Mesh(new PlaneGeometry(2, 2), rgbMaterial);
  quad.frustumCulled = false;
  screen.add(quad);
  const depthPass = new MeshBasicMaterial();
  const pixel = new Uint8Array(4);

  return {
    setProfiles(rgb: StreamProfile, depth: StreamProfile, minDepth: number, maxDepth: number) {
      rgbTarget.setSize(rgb.width, rgb.height);
      depthTarget.setSize(depth.width, depth.height);
      uniforms.validRange.value.set(minDepth, maxDepth);
    },
    capture(scene: Scene, rgb: PerspectiveCamera, depth: PerspectiveCamera) {
      renderer.setScissorTest(false);
      renderer.setRenderTarget(rgbTarget);
      renderer.clear();
      renderer.render(scene, rgb);
      renderer.setRenderTarget(depthTarget);
      renderer.clear();
      scene.overrideMaterial = depthPass;
      renderer.render(scene, depth);
      scene.overrideMaterial = null;
      renderer.setRenderTarget(null);
    },
    draw(view: 'rgb' | 'depth') {
      quad.material = view === 'rgb' ? rgbMaterial : depthMaterial;
      renderer.render(screen, screenCamera);
    },
    sample(x: number, y: number, profile: StreamProfile) {
      sampleMaterial.uniforms.sampleUv.value.set((x + 0.5) / profile.width, 1 - (y + 0.5) / profile.height);
      quad.material = sampleMaterial;
      renderer.setScissorTest(false);
      renderer.setRenderTarget(sampleTarget);
      renderer.render(screen, screenCamera);
      renderer.readRenderTargetPixels(sampleTarget, 0, 0, 1, 1, pixel);
      renderer.setRenderTarget(null);
      return pixel[3] === 0 ? null : (65536 * pixel[0] + 256 * pixel[1] + pixel[2]) / 1000;
    },
  };
}
