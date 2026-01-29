import Antigravity from './Antigravity';
import { Canvas } from '@react-three/fiber';

const AntigravityBackground = () => {
    return (
        <div className="fixed inset-0 z-[-1] bg-slate-950">
            <Canvas
                camera={{ position: [0, 0, 50], fov: 35 }}
                dpr={[1, 1.5]}
                gl={{ antialias: false, alpha: false }}
                eventSource={document.body}
                eventPrefix="client"
            >
                <Antigravity
                    count={300}
                    magnetRadius={6}
                    ringRadius={7}
                    waveSpeed={0.4}
                    waveAmplitude={1}
                    particleSize={1.5}
                    lerpSpeed={0.05}
                    color="#5227FF"
                    autoAnimate={true}
                    particleVariance={1}
                    rotationSpeed={0}
                    depthFactor={1}
                    pulseSpeed={3}
                    particleShape="capsule"
                    fieldStrength={10}
                />
            </Canvas>
        </div>
    );
};

export default AntigravityBackground;
