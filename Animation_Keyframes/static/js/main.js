// main.js

import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';

let mixer;

function main() {
    // Timer.
    const timer = new THREE.Timer();
    timer.connect(document);

    // Scene.
    const scene = new THREE.Scene();

    // Camera.
    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.set(5, 2, 8);

    // Renderer.
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const container = document.querySelector('#threejs-container');
    container.appendChild(renderer.domElement);

    // Orbit controls.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.7, 0);
    controls.update();

    // Stats.
    const stats = new Stats();
    container.appendChild(stats.dom);

    // Sky.
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    // Configure the visual appearance of the sky.
    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = 0;
    uniforms['rayleigh'].value = 3;
    uniforms['mieDirectionalG'].value = 0.7;
    uniforms['cloudElevation'].value = 1;
    uniforms['sunPosition'].value.set(- 0.8, 0.19, 0.56); // elevation: 11, azimuth: -55

    // Image based lighting and reflections from the sky.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const environment = pmremGenerator.fromScene(sky).texture;
    scene.environment = environment;

    // DRACOLoader.
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

    // GLTFLoader.
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load('static/models/LittlestTokyo.glb', function (gltf) {
        const model = gltf.scene;
        model.position.set(1, 1, 0);
        model.scale.set(0.01, 0.01, 0.01);
        scene.add(model);

        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();

        renderer.setAnimationLoop(animate);
    }, undefined, function (e) {
        console.error(e);
    });

    // Window resize.
    window.addEventListener('resize', onWindowResize);
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // Main animation loop.
    function animate() {
        timer.update();

        const delta = timer.getDelta();

        mixer.update(delta);
        controls.update();
        stats.update();

        renderer.render(scene, camera);
    }

    // Log the Three.js version number to the console.
    console.log("Three.js version", THREE.REVISION);
}

main();
