"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── Shared shaders ────────────────────────────────────────────────────── */

const vertexShader = /* glsl */ `
  attribute float aSize;
  uniform float uTime;
  varying float vDepthAlpha;

  void main() {
    vec3 pos = position;

    /* organic drift – each particle gets a unique phase from its position */
    float id = pos.x * 0.47 + pos.y * 0.31 + pos.z * 0.67;
    pos.x += sin(uTime * 0.12 + id * 2.1) * 0.42;
    pos.y += cos(uTime * 0.09 + id * 1.55) * 0.28;
    pos.z += sin(uTime * 0.07 + id * 1.15) * 0.19;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (280.0 / max(-mv.z, 0.1));
    gl_Position  = projectionMatrix * mv;

    /* fade particles that are far away for depth */
    vDepthAlpha = smoothstep(-16.0, -1.0, mv.z);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3  uColor;
  uniform float uBaseAlpha;
  varying float vDepthAlpha;

  void main() {
    vec2  c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;

    float a = smoothstep(0.5, 0.0, d);
    a *= a;                        /* softer gaussian-like falloff */
    a *= uBaseAlpha * vDepthAlpha;

    gl_FragColor = vec4(uColor, a);
  }
`;

/* ── Smoke layer – large, faint, warm/neutral fog ──────────────────────── */

const SMOKE_COUNT = 400;

function SmokeCloud() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const geo = useMemo(() => {
    const g    = new THREE.BufferGeometry();
    const pos  = new Float32Array(SMOKE_COUNT * 3);
    const size = new Float32Array(SMOKE_COUNT);

    for (let i = 0; i < SMOKE_COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 28;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = -3 + (Math.random() - 0.5) * 18;
      size[i]        = 3.5 + Math.random() * 6.5;
    }

    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize",    new THREE.BufferAttribute(size, 1));
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime!.value = clock.getElapsedTime();
  });

  return (
    <points geometry={geo}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime:      { value: 0 },
          uColor:     { value: new THREE.Color(0.4, 0.42, 0.45) },
          uBaseAlpha: { value: 0.05 },
        }}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

/* ── Dust motes – tiny, brighter specks ────────────────────────────────── */

const DUST_COUNT = 150;

function DustMotes() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const geo = useMemo(() => {
    const g    = new THREE.BufferGeometry();
    const pos  = new Float32Array(DUST_COUNT * 3);
    const size = new Float32Array(DUST_COUNT);

    for (let i = 0; i < DUST_COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = -1 + (Math.random() - 0.5) * 12;
      size[i]        = 0.15 + Math.random() * 0.55;
    }

    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize",    new THREE.BufferAttribute(size, 1));
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime!.value = clock.getElapsedTime();
  });

  return (
    <points geometry={geo}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime:      { value: 0 },
          uColor:     { value: new THREE.Color(0.8, 0.9, 0.85) },
          uBaseAlpha: { value: 0.28 },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── Exported canvas wrapper ───────────────────────────────────────────── */

export function SmokeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-2" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 72 }}
        gl={{ antialias: false, alpha: true }}
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <SmokeCloud />
        <DustMotes />
      </Canvas>

      {/* radial glow for ambient depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 80%)",
        }}
      />
    </div>
  );
}
