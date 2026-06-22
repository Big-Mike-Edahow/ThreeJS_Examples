// main.js

import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let model, skeleton, mixer;
const crossFadeControls = [];

let idleAction, walkAction, runAction;
let idleWeight, walkWeight, runWeight;
let actions, settings;

let singleStepMode = false;
let sizeOfNextStep = 0;

function main() {
    // Timer.
    const timer = new THREE.Timer();
    timer.connect(document);

    // Scene.
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
    scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

    // Camera.
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.set(1, 2, - 3);
    camera.lookAt(0, 1, 0);

    // Hemisphere light.
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Directional light.
    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(- 3, 10, - 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 2;
    dirLight.shadow.camera.bottom = - 2;
    dirLight.shadow.camera.left = - 2;
    dirLight.shadow.camera.right = 2;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 40;
    scene.add(dirLight);

    // Renderer.
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    const container = document.querySelector("#threejs-container");
    container.appendChild(renderer.domElement);

    // Stats.
    const stats = new Stats();
    container.appendChild(stats.dom);

    // Ground.
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false }));
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // GLTF Loader.
    const loader = new GLTFLoader();
    loader.load('static/models/Soldier.glb', function (gltf) {
        model = gltf.scene;
        scene.add(model);

        model.traverse(function (object) {
            if (object.isMesh) object.castShadow = true;
        });

        // Skeleton.
        skeleton = new THREE.SkeletonHelper(model);
        skeleton.visible = false;
        scene.add(skeleton);

        // Create the GUI panel.
        createPanel();

        const animations = gltf.animations;
        mixer = new THREE.AnimationMixer(model);

        idleAction = mixer.clipAction(animations[0]);
        walkAction = mixer.clipAction(animations[3]);
        runAction = mixer.clipAction(animations[1]);

        actions = [idleAction, walkAction, runAction];
        activateAllActions();
        renderer.setAnimationLoop(animate);
    });

    // GUI.
    function createPanel() {
        const panel = new GUI({ width: 310 });
        const folder1 = panel.addFolder('Visibility');
        const folder2 = panel.addFolder('Activation/Deactivation');
        const folder3 = panel.addFolder('Pausing/Stepping');
        const folder4 = panel.addFolder('Crossfading');
        const folder5 = panel.addFolder('Blend Weights');
        const folder6 = panel.addFolder('General Speed');

        settings = {
            'show model': true,
            'show skeleton': false,
            'deactivate all': deactivateAllActions,
            'activate all': activateAllActions,
            'pause/continue': pauseContinue,
            'make single step': toSingleStepMode,
            'modify step size': 0.05,
            'from walk to idle': function () {
                prepareCrossFade(walkAction, idleAction, 1.0);
            },
            'from idle to walk': function () {
                prepareCrossFade(idleAction, walkAction, 0.5);
            },
            'from walk to run': function () {
                prepareCrossFade(walkAction, runAction, 2.5);
            },
            'from run to walk': function () {
                prepareCrossFade(runAction, walkAction, 5.0);
            },
            'use default duration': true,
            'set custom duration': 3.5,
            'modify idle weight': 0.0,
            'modify walk weight': 1.0,
            'modify run weight': 0.0,
            'modify time scale': 1.0
        };

        folder1.add(settings, 'show model').onChange(showModel);
        folder1.add(settings, 'show skeleton').onChange(showSkeleton);
        folder2.add(settings, 'deactivate all');
        folder2.add(settings, 'activate all');
        folder3.add(settings, 'pause/continue');
        folder3.add(settings, 'make single step');
        folder3.add(settings, 'modify step size', 0.01, 0.1, 0.001);
        crossFadeControls.push(folder4.add(settings, 'from walk to idle'));
        crossFadeControls.push(folder4.add(settings, 'from idle to walk'));
        crossFadeControls.push(folder4.add(settings, 'from walk to run'));
        crossFadeControls.push(folder4.add(settings, 'from run to walk'));
        folder4.add(settings, 'use default duration');
        folder4.add(settings, 'set custom duration', 0, 10, 0.01);
        folder5.add(settings, 'modify idle weight', 0.0, 1.0, 0.01).listen().onChange(function (weight) {
            setWeight(idleAction, weight);

        });
        folder5.add(settings, 'modify walk weight', 0.0, 1.0, 0.01).listen().onChange(function (weight) {
            setWeight(walkAction, weight);
        });
        folder5.add(settings, 'modify run weight', 0.0, 1.0, 0.01).listen().onChange(function (weight) {
            setWeight(runAction, weight);
        });
        folder6.add(settings, 'modify time scale', 0.0, 1.5, 0.01).onChange(modifyTimeScale);

        folder1.open();
        folder2.open();
        folder3.open();
        folder4.open();
        folder5.open();
        folder6.open();
    }

    // Hide or show the 3D model by toggling its boolean visible property.
    function showModel(visibility) {
        model.visible = visibility;
    }

    // Toggle the on screen visibility of the 3D model's bone structure (armature).
    function showSkeleton(visibility) {
        skeleton.visible = visibility;
    }

    // Dynamically adjust the playback speed of all animations controlled by the mixer.
    function modifyTimeScale(speed) {
        mixer.timeScale = speed;
    }

    // Iterate through the animation controls and halt every active animation. 
    function deactivateAllActions() {
        actions.forEach(function (action) {
            action.stop();
        });
    }

    // Initialize and prepare character movement animations.
    function activateAllActions() {
        setWeight(idleAction, settings['modify idle weight']);
        setWeight(walkAction, settings['modify walk weight']);
        setWeight(runAction, settings['modify run weight']);
        actions.forEach(function (action) {
            action.play();
        });
    }

    // Toggle the playback state of character animations.
    function pauseContinue() {
        if (singleStepMode) {
            singleStepMode = false;
            unPauseAllActions();
        } else {
            if (idleAction.paused) {
                unPauseAllActions();
            } else {
                pauseAllActions();
            }
        }
    }

    // Freeze all currently running or registered animations in the scene.
    function pauseAllActions() {
        actions.forEach(function (action) {
            action.paused = true;
        });
    }

    // Resume all currently loaded animations at once.
    function unPauseAllActions() {
        actions.forEach(function (action) {
            action.paused = false;
        });
    }

    // Switch into a frame-by-frame, manual advancement mode.
    function toSingleStepMode() {
        unPauseAllActions();
        singleStepMode = true;
        sizeOfNextStep = settings['modify step size'];
    }

    // Handle the smooth transition, or crossfade, between two different character animations. For
    // example, walking to running, or running to idle, based on the current animation state.
    function prepareCrossFade(startAction, endAction, defaultDuration) {
        // Toggle default / custom crossfade duration according to the user's choice.
        const duration = setCrossFadeDuration(defaultDuration);

        // Do not go on in singleStepMode. Unpause all actions.
        singleStepMode = false;
        unPauseAllActions();

        // If the current action is 'idle' (duration 4 sec), execute the crossfade immediately;
        // else wait until the current action has finished its current loop.
        if (startAction === idleAction) {
            executeCrossFade(startAction, endAction, duration);
        } else {
            synchronizeCrossFade(startAction, endAction, duration);
        }
    }

    // Toggle between default crossfade duration and custom crossfade duration.
    function setCrossFadeDuration(defaultDuration) {
        if (settings['use default duration']) {
            return defaultDuration;
        } else {
            return settings['set custom duration'];
        }
    }

    // Wait for the current animation to finish its loop before starting the crossfade.
    function synchronizeCrossFade(startAction, endAction, duration) {
        mixer.addEventListener('loop', onLoopFinished);

        function onLoopFinished(event) {
            if (event.action === startAction) {
                mixer.removeEventListener('loop', onLoopFinished);
                executeCrossFade(startAction, endAction, duration);
            }
        }
    }

    // Smoothly transition from startAction to endAction, over a specific period of time.
    function executeCrossFade(startAction, endAction, duration) {
        // End action must get a weight of 1 before fading.
        setWeight(endAction, 1);
        endAction.time = 0;

        // Crossfade with warping enabled (third value).
        startAction.crossFadeTo(endAction, duration, true);
    }

    // Prepare the animation to be played or blended with other animations. Set the
    // animation's impact level, and restore its standard playback speed.
    function setWeight(action, weight) {
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(weight);
    }

    // Called by the render loop.
    function updateWeightSliders() {
        settings['modify idle weight'] = idleWeight;
        settings['modify walk weight'] = walkWeight;
        settings['modify run weight'] = runWeight;
    }

    // Called by the render loop.
    function updateCrossFadeControls() {
        if (idleWeight === 1 && walkWeight === 0 && runWeight === 0) {
            crossFadeControls[0].disable();
            crossFadeControls[1].enable();
            crossFadeControls[2].disable();
            crossFadeControls[3].disable();
        }
        if (idleWeight === 0 && walkWeight === 1 && runWeight === 0) {
            crossFadeControls[0].enable();
            crossFadeControls[1].disable();
            crossFadeControls[2].enable();
            crossFadeControls[3].disable();
        }
        if (idleWeight === 0 && walkWeight === 0 && runWeight === 1) {
            crossFadeControls[0].disable();
            crossFadeControls[1].disable();
            crossFadeControls[2].disable();
            crossFadeControls[3].enable();
        }
    }

    // Window resize.
    window.addEventListener('resize', onWindowResize);
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Main animation loop.
    function animate() {
        timer.update();

        // Get the current weights.
        idleWeight = idleAction.getEffectiveWeight();
        walkWeight = walkAction.getEffectiveWeight();
        runWeight = runAction.getEffectiveWeight();

        // Update the panel values.
        updateWeightSliders();

        // Enable/disable crossfade controls.
        updateCrossFadeControls();

        // Get the time elapsed since the last frame.
        let mixerUpdateDelta = timer.getDelta();

        // Make one step, then wait for user click.
        if (singleStepMode) {
            mixerUpdateDelta = sizeOfNextStep;
            sizeOfNextStep = 0;
        }

        // Update the animated models, render the visual output, and track performance.
        mixer.update(mixerUpdateDelta);
        renderer.render(scene, camera);
        stats.update();
    }
}

main();
