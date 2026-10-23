// Hook para manejar el Avatar 3D con Three.js y VRM
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { AvatarMetadata, AvatarGender, TargetLanguage, UserProfile } from '../types';
import { parseAvatarResponse, getDefaultMetadata } from '../lib/avatar';
import { useVoice, VoiceSelection } from './useVoice';

interface UseAvatarProps {
  profile: UserProfile;
  voiceEnabled: boolean;
  selectedVoice: VoiceSelection;
  onAudioEnd?: () => void;
}

interface UseAvatarReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoading: boolean;
  error: string | null;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  currentMetadata: AvatarMetadata | null;
  isSpeaking: boolean;
}

export function useAvatar({ profile, voiceEnabled, selectedVoice, onAudioEnd }: UseAvatarProps): UseAvatarReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMetadata, setCurrentMetadata] = useState<AvatarMetadata | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs para Three.js
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const audioQueueRef = useRef<Array<{ text: string; metadata: AvatarMetadata }>>([]);
  const isProcessingQueueRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Voice hook para TTS
  const voice = useVoice(profile.targetLanguage, profile.level, selectedVoice);

  // Inicializar Three.js y cargar VRM
  useEffect(() => {
    let mounted = true;
    
    async function initThreeJS() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        // Renderer
        const renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: false,
        });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        rendererRef.current = renderer;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f4); // stone-50
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(
          45,
          canvas.clientWidth / canvas.clientHeight,
          0.1,
          100
        );
        camera.position.set(0, 1.5, 2.5);
        camera.lookAt(0, 1.4, 0);
        cameraRef.current = camera;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-5, 5, -5);
        scene.add(fillLight);

        // Ground plane para sombras
        const groundGeometry = new THREE.PlaneGeometry(10, 10);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.15 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        scene.add(ground);

        // Cargar VRM
        await loadVRM(profile);

        // Animation loop
        function animate() {
          if (!mounted) return;
          animationFrameRef.current = requestAnimationFrame(animate);
          
          const delta = clockRef.current.getDelta();
          
          if (vrmRef.current) {
            vrmRef.current.update(delta);
          }
          
          renderer.render(scene, camera);
        }
        animate();

        // Handle resize
        function handleResize() {
          const canvas = canvasRef.current;
          if (!canvas || !rendererRef.current || !cameraRef.current) return;
          
          const width = canvas.clientWidth;
          const height = canvas.clientHeight;
          
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        }
        
        window.addEventListener('resize', handleResize);
        
        setIsLoading(false);

        return () => {
          mounted = false;
          window.removeEventListener('resize', handleResize);
          cancelAnimationFrame(animationFrameRef.current);
          
          // Cleanup
          vrmRef.current?.destroy?.();
          rendererRef.current?.dispose();
          rendererRef.current = null;
          sceneRef.current = null;
          cameraRef.current = null;
        };
      } catch (err) {
        console.error('Error initializing Three.js:', err);
        if (mounted) {
          setError('Error al inicializar el avatar 3D');
          setIsLoading(false);
        }
      }
    }

    initThreeJS();
  }, [profile.avatarGender, profile.targetLanguage]);

  // Cargar modelo VRM
  async function loadVRM(profile: UserProfile) {
    const scene = sceneRef.current;
    if (!scene) return;

    // Limpiar VRM anterior
    if (vrmRef.current) {
      scene.remove(vrmRef.current.scene);
      vrmRef.current.destroy?.();
      vrmRef.current = null;
    }

    // Determinar URL del modelo
    let modelUrl = profile.avatarModelUrl;
    if (!modelUrl) {
      // Usar Ready Player Me basado en género e idioma
      const gender = profile.avatarGender || 'female';
      const lang = profile.targetLanguage;
      // URLs de ejemplo - en producción usarían modelos reales de Ready Player Me
      const modelMap: Record<string, Record<string, string>> = {
        female: {
          German: 'https://models.readyplayer.me/674e4b5b3f8b4a001a2b3c4d.glb',
          English: 'https://models.readyplayer.me/674e4b5b3f8b4a001a2b3c4e.glb',
          French: 'https://models.readyplayer.me/674e4b5b3f8b4a001a2b3c4f.glb',
        },
        male: {
          German: 'https://models.readyplayer.me/674e4b5b3f8b4a001a2b3c50.glb',
          English: 'https://models.readyplayer.me/674e4b5b3f8b4a001a2b3c51.glb',
          French: 'https://models.readyplayer.me/674e4b5b3f8b4a001a2b3c52.glb',
        },
      };
      modelUrl = modelMap[gender]?.[lang] || modelMap.female.German;
    }

    try {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      
      const gltf = await loader.loadAsync(modelUrl);
      const vrm = gltf.userData.vrm;
      
      vrmRef.current = vrm;
      scene.add(vrm.scene);
      
      // Configurar sombra
      vrm.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      // Posicionar avatar
      vrm.scene.position.set(0, 0, 0);
      vrm.scene.scale.set(1, 1, 1);
      
      // Configurar lookAt para que mire a la cámara
      if (vrm.humanoid) {
        const head = vrm.humanoid.getBoneNode('head');
        if (head) {
          // El VRM ya tiene configuración de lookAt
        }
      }
      
      // Expresión inicial
      setExpression(vrm, 'NEUTRAL');
      
    } catch (err) {
      console.error('Error loading VRM:', err);
      // Fallback: crear avatar simple
      createFallbackAvatar();
    }
  }

  // Avatar fallback simple (cubo con cara) si falla VRM
  function createFallbackAvatar() {
    const scene = sceneRef.current;
    if (!scene) return;

    const group = new THREE.Group();
    
    // Cuerpo
    const bodyGeo = new THREE.CapsuleGeometry(0.3, 1, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4ade80 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    // Cabeza
    const headGeo = new THREE.SphereGeometry(0.25, 32, 32);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf5d0a9 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.7;
    head.castShadow = true;
    group.add(head);

    // Ojos
    const eyeGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 1.72, 0.2);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 1.72, 0.2);
    group.add(rightEye);

    // Boca (línea simple)
    const mouthGeo = new THREE.BoxGeometry(0.1, 0.02, 0.01);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 1.6, 0.23);
    group.add(mouth);

    // Guardar referencias para animación
    (group as any).head = head;
    (group as any).leftEye = leftEye;
    (group as any).rightEye = rightEye;
    (group as any).mouth = mouth;
    (group as any).isFallback = true;

    vrmRef.current = { scene: group, update: () => {} };
    scene.add(group);
  }

  // Aplicar expresión facial
  function setExpression(vrm: any, expression: AvatarMetadata['expr']) {
    if (!vrm) return;
    
    if (vrm.isFallback) {
      // Animación simple para fallback
      const mouth = vrm.mouth;
      if (mouth) {
        switch (expression) {
          case 'HAPPY':
            mouth.scale.y = 1.5;
            mouth.position.y = 1.62;
            break;
          case 'EMPATHETIC':
          case 'THINKING':
            mouth.scale.y = 0.5;
            break;
          case 'CONFUSED':
            mouth.rotation.z = 0.1;
            break;
          default:
            mouth.scale.y = 1;
            mouth.position.y = 1.6;
            mouth.rotation.z = 0;
        }
      }
      return;
    }

    // VRM real - usar blendshapes
    if (vrm.expressionManager) {
      // Reset all expressions first
      const presets = [
        'neutral', 'happy', 'angry', 'sad', 'surprised', 
        'relaxed', 'blink', 'blinkLeft', 'blinkRight',
        'lookUp', 'lookDown', 'lookLeft', 'lookRight',
        'aa', 'ih', 'ou', 'ee', 'oh'
      ];
      
      presets.forEach(preset => {
        vrm.expressionManager?.setValue(preset, 0);
      });

      // Apply new expression
      switch (expression) {
        case 'HAPPY':
          vrm.expressionManager.setValue('happy', 0.8);
          vrm.expressionManager.setValue('relaxed', 0.3);
          break;
        case 'EMPATHETIC':
          vrm.expressionManager.setValue('sad', 0.2);
          vrm.expressionManager.setValue('relaxed', 0.5);
          break;
        case 'THINKING':
          vrm.expressionManager.setValue('lookUp', 0.5);
          vrm.expressionManager.setValue('relaxed', 0.3);
          break;
        case 'CONFUSED':
          vrm.expressionManager.setValue('surprised', 0.4);
          vrm.expressionManager.setValue('lookLeft', 0.3);
          break;
        case 'PROUD':
          vrm.expressionManager.setValue('happy', 1.0);
          vrm.expressionManager.setValue('relaxed', 0.2);
          break;
        default: // NEUTRAL
          vrm.expressionManager.setValue('neutral', 0.6);
          vrm.expressionManager.setValue('relaxed', 0.4);
      }
    }
  }

  // Aplicar gesto corporal
  function playGesture(vrm: any, gesture: AvatarMetadata['gesture']) {
    if (!vrm || vrm.isFallback) return;
    
    if (vrm.humanoid) {
      const leftArm = vrm.humanoid.getBoneNode('leftUpperArm');
      const rightArm = vrm.humanoid.getBoneNode('rightUpperArm');
      const head = vrm.humanoid.getBoneNode('head');
      const spine = vrm.humanoid.getBoneNode('spine');
      const chest = vrm.humanoid.getBoneNode('chest');

      // Reset pose
      const resetRotation = new THREE.Euler(0, 0, 0);
      [leftArm, rightArm, head, spine, chest].forEach(bone => {
        if (bone) bone.rotation.set(0, 0, 0);
      });

      switch (gesture) {
        case 'NOD':
          if (head) {
            animateBone(head, new THREE.Euler(-0.3, 0, 0), new THREE.Euler(0.2, 0, 0), 300);
          }
          break;
        case 'DOUBLE_NOD':
          if (head) {
            animateBone(head, new THREE.Euler(-0.4, 0, 0), new THREE.Euler(0.3, 0, 0), 200, 2);
          }
          break;
        case 'TILT_HEAD':
          if (head) {
            animateBone(head, new THREE.Euler(0, 0, 0.3), new THREE.Euler(0, 0, -0.1), 400);
          }
          break;
        case 'SHRUG':
          if (leftArm && rightArm) {
            animateBone(leftArm, new THREE.Euler(0, 0, -0.5), resetRotation, 500);
            animateBone(rightArm, new THREE.Euler(0, 0, 0.5), resetRotation, 500);
          }
          break;
        case 'WAVE':
          if (rightArm) {
            animateBone(rightArm, new THREE.Euler(-1.5, 0, 0.5), resetRotation, 800, 2);
          }
          break;
        case 'POINT_PRACTICE':
          if (rightArm && chest) {
            animateBone(rightArm, new THREE.Euler(-1.2, -0.5, 0), resetRotation, 600);
            animateBone(chest, new THREE.Euler(0, -0.2, 0), resetRotation, 600);
          }
          break;
      }
    }
  }

  // Helper para animar huesos
  function animateBone(bone: THREE.Bone, from: THREE.Euler, to: THREE.Euler, duration: number, repeats = 1) {
    const startTime = Date.now();
    
    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      
      // Interpolar componente a componente
      const current = new THREE.Euler(
        THREE.MathUtils.lerp(from.x, to.x, eased),
        THREE.MathUtils.lerp(from.y, to.y, eased),
        THREE.MathUtils.lerp(from.z, to.z, eased),
        from.order
      );
      bone.rotation.copy(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (repeats > 1) {
        // Repetir en dirección opuesta
        setTimeout(() => animateBone(bone, to, from, duration, repeats - 1), 100);
      } else {
        // Volver a posición neutra suave
        setTimeout(() => {
          const returnStart = Date.now();
          function returnAnim() {
            const rElapsed = Date.now() - returnStart;
            const rProgress = Math.min(rElapsed / 300, 1);
            const rEased = 1 - Math.pow(1 - rProgress, 3);
            
            // Interpolar componente a componente
            bone.rotation.set(
              THREE.MathUtils.lerp(bone.rotation.x, 0, rEased),
              THREE.MathUtils.lerp(bone.rotation.y, 0, rEased),
              THREE.MathUtils.lerp(bone.rotation.z, 0, rEased)
            );
            
            if (rProgress < 1) requestAnimationFrame(returnAnim);
          }
          returnAnim();
        }, 200);
      }
    }
    animate();
  }

  // Aplicar mirada (gaze)
  function setGaze(vrm: any, gaze: AvatarMetadata['gaze']) {
    if (!vrm || vrm.isFallback) return;
    
    if (vrm.expressionManager) {
      // Reset gaze
      vrm.expressionManager.setValue('lookUp', 0);
      vrm.expressionManager.setValue('lookDown', 0);
      vrm.expressionManager.setValue('lookLeft', 0);
      vrm.expressionManager.setValue('lookRight', 0);
      
      switch (gaze) {
        case 'THINK_UP':
          vrm.expressionManager.setValue('lookUp', 0.6);
          vrm.expressionManager.setValue('lookLeft', 0.2);
          break;
        case 'DOWN_SOFT':
          vrm.expressionManager.setValue('lookDown', 0.4);
          break;
        case 'DIRECT':
        default:
          // Mirada neutral - ya está en 0
          break;
      }
    }
  }

  // Procesar cola de audio
  async function processAudioQueue() {
    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) return;
    
    isProcessingQueueRef.current = true;
    
    while (audioQueueRef.current.length > 0) {
      const item = audioQueueRef.current.shift()!;
      
      // Aplicar metadata antes de hablar (pausa inicial)
      if (item.metadata.pause_ms > 0) {
        await new Promise(r => setTimeout(r, item.metadata.pause_ms));
      }
      
      // Aplicar expresión y gesto
      const vrm = vrmRef.current;
      if (vrm) {
        setExpression(vrm, item.metadata.expr);
        setGaze(vrm, item.metadata.gaze);
        playGesture(vrm, item.metadata.gesture);
      }
      
      setCurrentMetadata(item.metadata);
      setIsSpeaking(true);
      
      // Hablar usando el hook de voz existente
      await new Promise<void>((resolve) => {
        voice.speakText(item.text);
        
        // Poll para detectar fin de habla
        const checkSpeaking = setInterval(() => {
          if (!voice.isSpeaking) {
            clearInterval(checkSpeaking);
            setIsSpeaking(false);
            setCurrentMetadata(null);
            resolve();
          }
        }, 100);
      });
      
      // Pequeña pausa entre mensajes
      await new Promise(r => setTimeout(r, 300));
    }
    
    isProcessingQueueRef.current = false;
  }

  // Función pública para hablar
  const speak = useCallback(async (rawResponse: string) => {
    const parsed = parseAvatarResponse(rawResponse);
    
    if (parsed) {
      audioQueueRef.current.push({ text: parsed.cleanText, metadata: parsed.metadata });
      if (!isProcessingQueueRef.current) {
        processAudioQueue();
      }
    } else if (rawResponse.trim()) {
      // Fallback sin metadata
      const metadata = getDefaultMetadata();
      audioQueueRef.current.push({ text: rawResponse.trim(), metadata });
      if (!isProcessingQueueRef.current) {
        processAudioQueue();
      }
    }
  }, [voice]);

  // Detener habla actual
  const stopSpeaking = useCallback(() => {
    voice.stopSpeech();
    audioQueueRef.current = [];
    isProcessingQueueRef.current = false;
    setIsSpeaking(false);
    setCurrentMetadata(null);
    
    // Reset expresión a neutral
    const vrm = vrmRef.current;
    if (vrm) {
      setExpression(vrm, 'NEUTRAL');
      setGaze(vrm, 'DIRECT');
    }
  }, [voice]);

  return {
    canvasRef,
    isLoading,
    error,
    speak,
    stopSpeaking,
    currentMetadata,
    isSpeaking,
  };
}