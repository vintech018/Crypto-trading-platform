"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, PointMaterial, Points } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

function ParticleSphere() {
    const ref = useRef<THREE.Points>(null);
    const count = 1500;

    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = 2.5 + Math.random() * 0.5; // Orbit radius
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
        }
        return pos;
    }, [count]);

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * 0.1;
            ref.current.rotation.z += delta * 0.05;
        }
    });

    return (
        <Points ref={ref} positions={positions} stride={3}>
            <PointMaterial
                transparent
                color="#ffffff"
                size={0.02}
                sizeAttenuation={true}
                depthWrite={false}
            />
        </Points>
    );
}

function CoreSphere() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y -= delta * 0.2;
            meshRef.current.rotation.x += delta * 0.1;
        }
    });

    return (
        <Sphere ref={meshRef} args={[1.5, 32, 32]}>
            <meshStandardMaterial
                color="#ffffff"
                wireframe
                transparent
                opacity={0.15}
            />
        </Sphere>
    );
}

export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
            {/* 3D Background */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
                    <ParticleSphere />
                    <CoreSphere />
                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        autoRotate
                        autoRotateSpeed={0.5}
                    />
                </Canvas>
            </div>

            {/* Floating Gradients */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_50%)]" />

            {/* Content */}
            <div className="container relative z-10 mx-auto px-6 text-center max-w-5xl">
                <div className="flex flex-col items-center">


                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight text-white mb-6">
                        {["Trade", "Crypto"].map((word, i) => (
                            <motion.span
                                key={word}
                                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{ duration: 0.8, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                className="inline-block mr-3 md:mr-4"
                            >
                                {word}
                            </motion.span>
                        ))}
                        <br className="hidden md:block" />
                        {["Without", "Risk"].map((word, i) => (
                            <motion.span
                                key={word}
                                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                className={`inline-block mr-3 md:mr-4 text-transparent bg-clip-text bg-gradient-to-r from-white ${i === 1 ? 'to-white/40' : 'to-white/80'}`}
                            >
                                {word}
                            </motion.span>
                        ))}
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                        className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed"
                    >
                        Practice crypto trading with $50,000 in virtual capital and institutional-grade AI chart analysis.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <motion.a
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            href="/signup"
                            className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-lg font-semibold text-lg transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)]"
                        >
                            Start Trading
                        </motion.a>
                        <motion.a
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            href="#features"
                            className="w-full sm:w-auto px-8 py-4 bg-transparent text-white border border-white/20 rounded-lg font-semibold text-lg hover:bg-white/5 transition-colors"
                        >
                            Explore Features
                        </motion.a>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
