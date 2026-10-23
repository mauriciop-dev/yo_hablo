// Componente para seleccionar avatar (hombre/mujer)
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, User, Loader2 } from 'lucide-react';
import type { AvatarGender, TargetLanguage } from '../types';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { generateReadyPlayerMeUrl } from '../lib/avatar';

interface AvatarSelectorProps {
  targetLanguage: TargetLanguage;
  onSelect: (gender: AvatarGender, modelUrl: string) => void;
  initialGender?: AvatarGender;
}

export default function AvatarSelector({ targetLanguage, onSelect, initialGender = 'female' }: AvatarSelectorProps) {
  const [selectedGender, setSelectedGender] = useState<AvatarGender>(initialGender);
  const [previewModels, setPreviewModels] = useState<Record<AvatarGender, { scene: THREE.Scene; renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; vrm: any } | null>>({
    male: null,
    female: null,
  });
  const [loading, setLoading] = useState<AvatarGender | null>(null);
  const containerRefs = useRef<Record<AvatarGender, HTMLButtonElement | null>>({ male: null, female: null });

  // Cargar previews de ambos avatares
  useEffect(() => {
    let mounted = true;
    let animationFrames: Record<AvatarGender, number> = { male: 0, female: 0 };

    async function loadPreview(gender: AvatarGender) {
      const container = containerRefs.current[gender];
      if (!container || previewModels[gender]) return;

      setLoading(gender);
      
      try {
        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xfafafa);

        // Camera
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 1.5, 2.2);
        camera.lookAt(0, 1.4, 0);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(200, 280);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(3, 5, 3);
        dirLight.castShadow = true;
        scene.add(dirLight);

        // Load VRM
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));
        
        const modelUrl = generateReadyPlayerMeUrl(gender);
        const gltf = await loader.loadAsync(modelUrl);
        const vrm = gltf.userData.vrm;
        
        vrm.scene.position.set(0, 0, 0);
        scene.add(vrm.scene);

        vrm.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Expresión neutral amigable
        if (vrm.expressionManager) {
          vrm.expressionManager.setValue('neutral', 0.5);
          vrm.expressionManager.setValue('happy', 0.3);
          vrm.expressionManager.setValue('relaxed', 0.4);
        }

        if (mounted) {
          setPreviewModels(prev => ({ ...prev, [gender]: { scene, renderer, camera, vrm } }));
          
          // Animation loop for preview
          const clock = new THREE.Clock();
          function animate() {
            if (!mounted) return;
            animationFrames[gender] = requestAnimationFrame(animate);
            const delta = clock.getDelta();
            vrm.update(delta);
            renderer.render(scene, camera);
          }
          animate();
        }
      } catch (err) {
        console.error(`Error loading ${gender} preview:`, err);
        // Fallback simple
        createFallbackPreview(gender, container);
      } finally {
        if (mounted) setLoading(null);
      }
    }

    function createFallbackPreview(gender: AvatarGender, container: HTMLButtonElement) {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xfafafa);
      
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 1.5, 2.2);
      camera.lookAt(0, 1.4, 0);
      
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(200, 280);
      container.appendChild(renderer.domElement);
      
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);
      
      const group = new THREE.Group();
      
      // Cuerpo
      const bodyGeo = new THREE.CapsuleGeometry(0.3, 1, 8, 16);
      const bodyMat = new THREE.MeshStandardMaterial({ color: gender === 'female' ? 0xf0a5c8 : 0x60a5fa });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.8;
      group.add(body);
      
      // Cabeza
      const headGeo = new THREE.SphereGeometry(0.25, 32, 32);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xf5d0a9 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.7;
      group.add(head);
      
      // Ojos
      const eyeGeo = new THREE.SphereGeometry(0.04, 16, 16);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.08, 1.72, 0.2);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.08, 1.72, 0.2);
      group.add(leftEye, rightEye);
      
      // Sonrisa
      const mouthGeo = new THREE.TorusGeometry(0.08, 0.02, 8, 16, 0, Math.PI);
      const mouthMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const mouth = new THREE.Mesh(mouthGeo, mouthMat);
      mouth.position.set(0, 1.6, 0.23);
      mouth.rotation.x = Math.PI;
      group.add(mouth);
      
      scene.add(group);
      
      const clock = new THREE.Clock();
      function animate() {
        if (!mounted) return;
        animationFrames[gender] = requestAnimationFrame(animate);
        // Leve rotación para mostrar 3D
        group.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.15;
        renderer.render(scene, camera);
      }
      animate();
      
      if (mounted) {
        setPreviewModels(prev => ({ ...prev, [gender]: { scene, renderer, camera, vrm: { scene: group, update: () => {} } } }));
      }
    }

    loadPreview('male');
    loadPreview('female');

    return () => {
      mounted = false;
      Object.values(animationFrames).forEach(id => cancelAnimationFrame(id));
      Object.values(previewModels).forEach(model => {
        if (model) {
          model.vrm?.destroy?.();
          model.renderer.dispose();
        }
      });
    };
  }, [targetLanguage]);

  const handleSelect = (gender: AvatarGender) => {
    setSelectedGender(gender);
    const modelUrl = generateReadyPlayerMeUrl(gender);
    onSelect(gender, modelUrl);
  };

  const genders: AvatarGender[] = ['female', 'male'];
  const labels: Record<AvatarGender, string> = { female: 'Mujer', male: 'Hombre' };
  const icons: Record<AvatarGender, React.ReactNode> = { 
    female: <User className="w-8 h-8" style={{ transform: 'scaleX(-1)' }} />,
    male: <User className="w-8 h-8" />,
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-stone-800">Elige tu Avatar</h2>
        <p className="text-stone-600 max-w-xs mx-auto">
          Tu compañero de conversación para practicar {targetLanguage}. 
          Podrás cambiarlo después en configuración.
        </p>
      </div>

      <div className="flex gap-6" role="radiogroup" aria-label="Seleccionar género del avatar">
        {genders.map(gender => {
          const isSelected = selectedGender === gender;
          const preview = previewModels[gender];
          const isLoading = loading === gender;
          
          return (
            <button
              key={gender}
              onClick={() => handleSelect(gender)}
              ref={el => { containerRefs.current[gender] = el; }}
              className={`relative group flex flex-col items-center space-y-3 p-4 rounded-2xl border-2 transition-all ${
                isSelected 
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100' 
                  : 'border-stone-200 bg-white hover:border-emerald-300 hover:shadow-md'
              }`}
              style={{ width: '220px' }}
              aria-pressed={isSelected}
            >
              {/* Preview 3D */}
              <div className="relative w-48 h-64 rounded-xl bg-stone-50 overflow-hidden flex items-center justify-center">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  </div>
                )}
                {!isLoading && !preview && (
                  <div className="text-stone-400 text-sm">Cargando...</div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col items-center space-y-1">
                <div className="flex items-center space-x-2">
                  {icons[gender]}
                  <span className="font-semibold text-stone-800">{labels[gender]}</span>
                </div>
                <p className="text-xs text-stone-500 text-center px-2">
                  Voz y expresiones adaptadas a {targetLanguage}
                </p>
              </div>

              {/* Checkmark */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Flecha continuar */}
              {isSelected && (
                <ArrowRight className="w-6 h-6 text-emerald-600 animate-bounce" />
              )}
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-xs text-center">
        <p className="text-xs text-stone-400">
          Modelos 3D gratuitos de <a href="https://readyplayer.me" target="_blank" rel="noopener" className="underline hover:text-emerald-600">Ready Player Me</a>
        </p>
      </div>
    </div>
  );
}