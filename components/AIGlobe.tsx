'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AIGlobeProps {
  state: 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED' | 'RECOVERING';
  speechVolume?: number; // Optional volume parameter for speaking animation
}

export default function AIGlobe({ state, speechVolume = 0.5 }: AIGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const speechVolumeRef = useRef(speechVolume);

  // Keep refs in sync for the animation loop
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    speechVolumeRef.current = speechVolume;
  }, [speechVolume]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x00020a, 0.15);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 6;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0x0a192f, 2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00f0ff, 5, 20);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x0033ff, 3, 20);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // 5. Create Core Sphere (Dark solid interior to block back lines)
    const coreGeo = new THREE.SphereGeometry(1.6, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00030d,
      transparent: true,
      opacity: 0.9,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // 6. Create Digital Network Shell (Icosahedron Wireframe)
    const netGeo = new THREE.IcosahedronGeometry(1.8, 2);
    const netMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const netMesh = new THREE.Mesh(netGeo, netMat);
    scene.add(netMesh);

    // 7. Create Glowing Vertices (Nodes)
    const pointsMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.07,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const nodes = new THREE.Points(netGeo, pointsMat);
    scene.add(nodes);

    // 8. Glowing Outer Atmosphere Sprite / Subtle Halo
    // We can simulate an atmospheric halo using a translucent outer sphere
    const haloGeo = new THREE.SphereGeometry(1.95, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    scene.add(haloMesh);

    // 9. Particles System (Floating dust)
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // Position particles in a spherical shell around the globe
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.2 + Math.random() * 2.5; // Radius range
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Speeds
      particleSpeeds[i * 3] = (Math.random() - 0.5) * 0.01;
      particleSpeeds[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      particleSpeeds[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00bcff,
      size: 0.035,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 10. Outer Waveform Energy Ring (dynamic line loop)
    const wavePointsCount = 128;
    const waveGeo = new THREE.BufferGeometry();
    const wavePositions = new Float32Array((wavePointsCount + 1) * 3);
    
    // Set initial circular points
    const defaultRadius = 2.4;
    for (let i = 0; i <= wavePointsCount; i++) {
      const angle = (i / wavePointsCount) * Math.PI * 2;
      wavePositions[i * 3] = Math.cos(angle) * defaultRadius;
      wavePositions[i * 3 + 1] = Math.sin(angle) * defaultRadius;
      wavePositions[i * 3 + 2] = 0;
    }
    waveGeo.setAttribute('position', new THREE.BufferAttribute(wavePositions, 3));
    
    const waveMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      linewidth: 2, // Note: WebGL line width is typically 1 in most browsers
    });
    const waveLine = new THREE.Line(waveGeo, waveMat);
    // Position it slightly forward so it surrounds the sphere nicely
    waveLine.rotation.x = Math.PI / 4; 
    waveLine.rotation.y = Math.PI / 6;
    scene.add(waveLine);

    // Secondary ring (subtle orbit ring around)
    const ringGeo = new THREE.BufferGeometry();
    const ringPositions = new Float32Array(100 * 3);
    const ringRadius = 2.9;
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      ringPositions[i * 3] = Math.cos(angle) * ringRadius;
      ringPositions[i * 3 + 1] = Math.sin(angle) * ringRadius;
      ringPositions[i * 3 + 2] = 0;
    }
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x0033ff,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const ringLine = new THREE.LineLoop(ringGeo, ringMat);
    ringLine.rotation.x = -Math.PI / 6;
    ringLine.rotation.y = Math.PI / 3;
    scene.add(ringLine);

    // 11. Animation variables
    let clock = new THREE.Clock();
    let animationFrameId: number;
    let flashIntensity = 0;

    // Helper to calculate wave amplitude
    const waveRadiusAtAngle = (angle: number, time: number, currentState: string) => {
      let baseRadius = defaultRadius;
      let amplitude = 0.05;
      let frequency = 2;

      switch (currentState) {
        case 'LISTENING':
          // Slow pulsing expand/contract + small dynamic waves
          baseRadius = defaultRadius + Math.sin(time * 3) * 0.15;
          amplitude = 0.08 + Math.cos(time * 5) * 0.03;
          frequency = 4;
          return baseRadius + Math.sin(angle * frequency + time * 4) * amplitude;

        case 'THINKING':
          // Multi-frequency rapid waves, rotating
          baseRadius = defaultRadius;
          amplitude = 0.06;
          return (
            baseRadius +
            Math.sin(angle * 8 + time * 12) * amplitude +
            Math.cos(angle * 12 - time * 15) * 0.03
          );

        case 'SPEAKING':
          // Large dramatic peaks synced to pseudo-volume
          baseRadius = defaultRadius + Math.sin(time * 2) * 0.05;
          const volFactor = speechVolumeRef.current;
          amplitude = 0.12 + volFactor * 0.35;
          frequency = 5;
          return (
            baseRadius +
            Math.sin(angle * frequency + time * 8) * amplitude * Math.sin(angle * 2) +
            Math.sin(angle * 14 + time * 20) * (amplitude * 0.3)
          );

        case 'INTERRUPTED':
          // Instantly collapse waveform towards zero or core
          return 1.7 + Math.sin(time * 40) * 0.05;

        case 'RECOVERING':
          // Rebuilding ring, low-frequency ripple
          baseRadius = defaultRadius * 0.85;
          amplitude = 0.03 + Math.sin(time * 2) * 0.02;
          return baseRadius + Math.sin(angle * 3 + time * 5) * amplitude;

        case 'READY':
        default:
          // Gentle ambient breathing
          baseRadius = defaultRadius;
          amplitude = 0.03;
          frequency = 3;
          return baseRadius + Math.sin(angle * frequency + time * 1.5) * amplitude;
      }
    };

    // 12. Animation loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      const currentState = stateRef.current;

      // A. Sphere Rotation (Varies by state)
      let rotationSpeed = 0.003;
      if (currentState === 'THINKING') {
        rotationSpeed = 0.025;
      } else if (currentState === 'SPEAKING') {
        rotationSpeed = 0.007;
      } else if (currentState === 'LISTENING') {
        rotationSpeed = 0.002;
      } else if (currentState === 'RECOVERING') {
        rotationSpeed = 0.008;
      } else if (currentState === 'INTERRUPTED') {
        rotationSpeed = 0.001; // Freezes briefly
      }

      netMesh.rotation.y += rotationSpeed;
      netMesh.rotation.x += rotationSpeed * 0.4;
      nodes.rotation.y += rotationSpeed;
      nodes.rotation.x += rotationSpeed * 0.4;

      // Slow drift for core
      coreMesh.rotation.y -= 0.001;

      // B. Slow rotate support ring
      ringLine.rotation.z += 0.002;

      // C. Flash handling for Interrupted state
      if (currentState === 'INTERRUPTED') {
        if (flashIntensity === 0) {
          flashIntensity = 1.0; // Trigger flash
        }
      } else {
        // Slowly decay flash
        if (flashIntensity > 0) {
          flashIntensity -= 0.05;
        }
      }

      // Apply flash visuals to core and halo
      if (flashIntensity > 0) {
        // Flash color blend (cyan/white high-energy pulse)
        netMat.color.setHex(0xff3b30); // Red alert tone for interrupt!
        pointsMat.color.setHex(0xff5e55);
        waveMat.color.setHex(0xff3b30);
        haloMat.color.setHex(0xff3b30);
        haloMat.opacity = 0.05 + flashIntensity * 0.35;
        netMat.opacity = 0.25 + flashIntensity * 0.4;
      } else {
        // Standard cyberpunk teal/cyan colors
        if (currentState === 'THINKING') {
          netMat.color.setHex(0x0088ff); // Deep blue for processing
          pointsMat.color.setHex(0x00f0ff);
          waveMat.color.setHex(0x0088ff);
          haloMat.color.setHex(0x0055ff);
          haloMat.opacity = 0.08;
        } else if (currentState === 'RECOVERING') {
          netMat.color.setHex(0x7000ff); // Purple/violet for recovering
          pointsMat.color.setHex(0xa855f7);
          waveMat.color.setHex(0x7000ff);
          haloMat.color.setHex(0xa855f7);
          haloMat.opacity = 0.05;
        } else if (currentState === 'SPEAKING') {
          netMat.color.setHex(0x00f0ff); // Bright electric cyan
          pointsMat.color.setHex(0xffffff); // White hot nodes
          waveMat.color.setHex(0x00f0ff);
          haloMat.color.setHex(0x00f0ff);
          // Scale halo with speech volume
          haloMat.opacity = 0.05 + speechVolumeRef.current * 0.15;
        } else {
          netMat.color.setHex(0x00e5ff);
          pointsMat.color.setHex(0x00f0ff);
          waveMat.color.setHex(0x00f0ff);
          haloMat.color.setHex(0x00f0ff);
          haloMat.opacity = 0.04;
        }
        netMat.opacity = 0.25;
      }

      // D. Update Floating Particles Position
      const particlePositions = particleSystem.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        // Particles move slightly differently depending on state
        if (currentState === 'LISTENING') {
          // Particles get pulled inward towards the sphere
          let px = particlePositions[i * 3];
          let py = particlePositions[i * 3 + 1];
          let pz = particlePositions[i * 3 + 2];
          let d = Math.sqrt(px * px + py * py + pz * pz);
          
          if (d > 1.8) {
            // Speed inward
            const speed = 0.02;
            particlePositions[i * 3] -= (px / d) * speed;
            particlePositions[i * 3 + 1] -= (py / d) * speed;
            particlePositions[i * 3 + 2] -= (pz / d) * speed;
          } else {
            // Reset outward
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = 4.0 + Math.random() * 1.5;
            particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            particlePositions[i * 3 + 2] = r * Math.cos(phi);
          }
        } else if (currentState === 'THINKING') {
          // Particles orbit rapidly
          let px = particlePositions[i * 3];
          let py = particlePositions[i * 3 + 1];
          let pz = particlePositions[i * 3 + 2];
          // Simple orbit rotation around Y axis
          const angle = 0.02;
          particlePositions[i * 3] = px * Math.cos(angle) - pz * Math.sin(angle);
          particlePositions[i * 3 + 2] = px * Math.sin(angle) + pz * Math.cos(angle);
          // Wave drift
          particlePositions[i * 3 + 1] += Math.sin(time + i) * 0.005;
        } else {
          // Standard slow random floating drift
          particlePositions[i * 3] += particleSpeeds[i * 3];
          particlePositions[i * 3 + 1] += particleSpeeds[i * 3 + 1];
          particlePositions[i * 3 + 2] += particleSpeeds[i * 3 + 2];

          // Re-contain particles if they float too far
          let d = Math.sqrt(
            particlePositions[i * 3] ** 2 +
            particlePositions[i * 3 + 1] ** 2 +
            particlePositions[i * 3 + 2] ** 2
          );
          if (d > 5.0 || d < 1.6) {
            // Randomize speed direction
            particleSpeeds[i * 3] = (Math.random() - 0.5) * 0.01;
            particleSpeeds[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
            particleSpeeds[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
            
            // Reposition at boundary
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = d < 1.6 ? 2.5 : 4.5;
            particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            particlePositions[i * 3 + 2] = r * Math.cos(phi);
          }
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;

      // E. Update Waveform Energy Ring vertices
      const wavePositionsArr = waveLine.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i <= wavePointsCount; i++) {
        const angle = (i / wavePointsCount) * Math.PI * 2;
        const currentRadius = waveRadiusAtAngle(angle, time, currentState);

        wavePositionsArr[i * 3] = Math.cos(angle) * currentRadius;
        wavePositionsArr[i * 3 + 1] = Math.sin(angle) * currentRadius;
        // Add subtle waving on the Z axis too for full 3D feel
        wavePositionsArr[i * 3 + 2] = Math.sin(angle * 4 + time * 3) * (currentState === 'SPEAKING' ? 0.15 : 0.05);
      }
      waveLine.geometry.attributes.position.needsUpdate = true;

      // Dynamic scaling for core sphere and network based on states
      if (currentState === 'LISTENING') {
        const pulse = 1.0 + Math.sin(time * 4) * 0.04;
        coreMesh.scale.set(pulse, pulse, pulse);
        netMesh.scale.set(pulse, pulse, pulse);
        nodes.scale.set(pulse, pulse, pulse);
      } else if (currentState === 'SPEAKING') {
        const pulse = 1.0 + speechVolumeRef.current * 0.12 * Math.sin(time * 18);
        coreMesh.scale.set(pulse, pulse, pulse);
        netMesh.scale.set(pulse, pulse, pulse);
        nodes.scale.set(pulse, pulse, pulse);
      } else if (currentState === 'INTERRUPTED') {
        // Quick shrink-flash
        const shrink = 0.9 + flashIntensity * 0.15;
        coreMesh.scale.set(shrink, shrink, shrink);
        netMesh.scale.set(shrink, shrink, shrink);
        nodes.scale.set(shrink, shrink, shrink);
      } else {
        // Slow ambient breathing
        const breathe = 1.0 + Math.sin(time * 1.5) * 0.015;
        coreMesh.scale.set(breathe, breathe, breathe);
        netMesh.scale.set(breathe, breathe, breathe);
        nodes.scale.set(breathe, breathe, breathe);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 13. Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 14. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
      
      // Dispose Three.js objects
      coreGeo.dispose();
      coreMat.dispose();
      netGeo.dispose();
      netMat.dispose();
      pointsMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      waveGeo.dispose();
      waveMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* 3D WebGL Canvas Container */}
      <div 
        ref={containerRef} 
        className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] md:w-[260px] md:h-[260px] relative z-10"
        id="rime-webgl-canvas-container"
      />

      {/* Decorative Outer Aura / Cyberpunk Ring elements in HTML for perfect smooth gradients */}
      <div 
        className={`absolute rounded-full pointer-events-none transition-all duration-700 ease-out z-0
          ${state === 'INTERRUPTED' ? 'bg-red-500/10 border-red-500/20 scale-95 blur-xl' : ''}
          ${state === 'RECOVERING' ? 'bg-purple-500/5 border-purple-500/10 scale-100 blur-xl' : ''}
          ${state === 'THINKING' ? 'bg-blue-500/5 border-blue-500/15 scale-105 blur-lg' : ''}
          ${state === 'LISTENING' ? 'bg-cyan-500/10 border-cyan-400/20 scale-110 blur-xl animate-pulse' : ''}
          ${state === 'SPEAKING' ? 'bg-cyan-400/8 border-cyan-400/20 scale-110 blur-xl' : ''}
          ${state === 'READY' ? 'bg-cyan-950/20 border-cyan-500/5 scale-100 blur-2xl' : ''}
          w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] md:w-[310px] md:h-[310px] border
        `}
      />

      {/* Subtly rotated decorative overlay rings */}
      <div 
        className="absolute w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] md:w-[240px] md:h-[240px] rounded-full border border-dashed border-cyan-500/10 pointer-events-none z-0 rotate-12 animate-[spin_100s_linear_infinite]"
      />
      <div 
        className="absolute w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] md:w-[260px] md:h-[260px] rounded-full border border-cyan-500/5 pointer-events-none z-0 -rotate-45 animate-[spin_140s_linear_infinite]"
      />
    </div>
  );
}
