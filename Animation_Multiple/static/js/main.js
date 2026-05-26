// main.js

import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Variables.
let model, animations;
const mixers = [], objects = [];
const params = {
    sharedSkeleton: false
};

function main() {
    // Timer.
    const timer = new THREE.Timer();
    timer.connect(document);

    // Scene.
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
    scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

    // Camera.
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(2, 3, - 6);
    camera.lookAt(0, 1, 0);

    // Hemisphere lighting.
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Directional lighting.
    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(- 3, 10, - 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 4;
    dirLight.shadow.camera.bottom = - 4;
    dirLight.shadow.camera.left = - 4;
    dirLight.shadow.camera.right = 4;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 40;
    scene.add(dirLight);

    // Renderer.
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    renderer.shadowMap.enabled = true;
    const container = document.querySelector('#threejs-container');
    container.appendChild(renderer.domElement);

    // Orbit controls.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 0.1;
    controls.maxDistance = 50;

    // Ground.
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false }));
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // GUI.
    const gui = new GUI();
    gui.add(params, 'sharedSkeleton').onChange(function () {
        clearScene();
        if (params.sharedSkeleton === true) {
            setupSharedSkeletonScene();
        } else {
            setupDefaultScene();
        }
    });
    gui.open();

    // GLTF Loader.
    const loader = new GLTFLoader();
    loader.load('static/models/Soldier.glb', function (gltf) {
        model = gltf.scene;
        animations = gltf.animations;
        model.traverse(function (object) {
            if (object.isMesh) object.castShadow = true;
        });
        setupDefaultScene();
    });

    // Clear the scene.
    function clearScene() {
        for (const mixer of mixers) {
            mixer.stopAllAction();
        }
        mixers.length = 0;

        for (const object of objects) {
            scene.remove(object);
            scene.traverse(function (child) {
                if (child.isSkinnedMesh) child.skeleton.dispose();
            });
        }
    }

    // Set up the default scene.
    function setupDefaultScene() {
        const model1 = SkeletonUtils.clone(model);
        const model2 = SkeletonUtils.clone(model);
        const model3 = SkeletonUtils.clone(model);

        model1.position.x = - 2;
        model2.position.x = 0;
        model3.position.x = 2;

        const mixer1 = new THREE.AnimationMixer(model1);
        const mixer2 = new THREE.AnimationMixer(model2);
        const mixer3 = new THREE.AnimationMixer(model3);

        mixer1.clipAction(animations[0]).play(); // idle
        mixer2.clipAction(animations[1]).play(); // run
        mixer3.clipAction(animations[3]).play(); // walk

        scene.add(model1, model2, model3);
        objects.push(model1, model2, model3);
        mixers.push(mixer1, mixer2, mixer3);
    }

    /* Three cloned models with a single shared skeleton. All models share the same
        animation state. The bones need to be in the scene for the animation to work. */
    function setupSharedSkeletonScene() {
        const sharedModel = SkeletonUtils.clone(model);
        const shareSkinnedMesh = sharedModel.getObjectByName('vanguard_Mesh');
        const sharedSkeleton = shareSkinnedMesh.skeleton;
        const sharedParentBone = sharedModel.getObjectByName('mixamorigHips');
        scene.add(sharedParentBone);

        const model1 = shareSkinnedMesh.clone();
        const model2 = shareSkinnedMesh.clone();
        const model3 = shareSkinnedMesh.clone();

        model1.bindMode = THREE.DetachedBindMode;
        model2.bindMode = THREE.DetachedBindMode;
        model3.bindMode = THREE.DetachedBindMode;

        const identity = new THREE.Matrix4();

        model1.bind(sharedSkeleton, identity);
        model2.bind(sharedSkeleton, identity);
        model3.bind(sharedSkeleton, identity);

        model1.position.x = - 2;
        model2.position.x = 0;
        model3.position.x = 2;

        // Apply transformation from the glTF asset.
        model1.scale.setScalar(0.01);
        model1.rotation.x = - Math.PI * 0.5;
        model2.scale.setScalar(0.01);
        model2.rotation.x = - Math.PI * 0.5;
        model3.scale.setScalar(0.01);
        model3.rotation.x = - Math.PI * 0.5;

        // Mixer.
        const mixer = new THREE.AnimationMixer(sharedParentBone);
        mixer.clipAction(animations[1]).play();
        scene.add(sharedParentBone, model1, model2, model3);
        objects.push(sharedParentBone, model1, model2, model3);
        mixers.push(mixer);
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
        const delta = timer.getDelta();
        for (const mixer of mixers) mixer.update(delta);
        renderer.render(scene, camera);
    }
}

main();
