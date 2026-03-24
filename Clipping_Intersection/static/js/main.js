// main.js

import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function main() {
    const params = {
        clipIntersection: true,
        planeConstant: 0,
        showHelpers: false,
        alphaToCoverage: true,
    };

    const clipPlanes = [
        new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, - 1, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, 0, - 1), 0)
    ];

    // Scene.
    const scene = new THREE.Scene();

    // Camera.
    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 200);
    camera.position.set(- 1.5, 2.5, 3.0);

    // Lighting.
    const light = new THREE.HemisphereLight(0xffffff, 0x080808, 4.5);
    light.position.set(- 1.25, 1, 1.25);
    scene.add(light);

    // Renderer.
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.localClippingEnabled = true;
    const container = document.querySelector("#threejs-container");
    container.appendChild(renderer.domElement);

    // Orbit Controls.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.enablePan = false;
    controls.autoRotate = true

    // Group.
    const group = new THREE.Group();
    for (let i = 1; i <= 30; i += 2) {
        const geometry = new THREE.SphereGeometry(i / 30, 48, 24);
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.5, 0.5, THREE.SRGBColorSpace),
            side: THREE.DoubleSide,
            clippingPlanes: clipPlanes,
            clipIntersection: params.clipIntersection,
            alphaToCoverage: true,
        });

        group.add(new THREE.Mesh(geometry, material));
    }
    scene.add(group);

    // Helpers.
    const helpers = new THREE.Group();
    helpers.add(new THREE.PlaneHelper(clipPlanes[0], 2, 0xff0000));
    helpers.add(new THREE.PlaneHelper(clipPlanes[1], 2, 0x00ff00));
    helpers.add(new THREE.PlaneHelper(clipPlanes[2], 2, 0x0000ff));
    helpers.visible = false;
    scene.add(helpers);

    // GUI.
    const gui = new GUI();
    gui.add(params, 'alphaToCoverage').onChange(function (value) {
        group.children.forEach(c => {
            c.material.alphaToCoverage = Boolean(value);
            c.material.needsUpdate = true;
        });
        renderer.render(scene, camera);
    });
    gui.add(params, 'clipIntersection').name('clip intersection').onChange(function (value) {
        const children = group.children;

        for (let i = 0; i < children.length; i++) {
            children[i].material.clipIntersection = value;
        }
        renderer.render(scene, camera);
    });
    gui.add(params, 'planeConstant', - 1, 1).step(0.01).name('plane constant').onChange(function (value) {
        for (let j = 0; j < clipPlanes.length; j++) {
            clipPlanes[j].constant = value;
        }
        renderer.render(scene, camera);
    });
    gui.add(params, 'showHelpers').name('show helpers').onChange(function (value) {
        helpers.visible = value;
        renderer.render(scene, camera);
    });

    // Responsiveness.
    window.addEventListener('resize', onWindowResize);
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);
    }

    // Main animation loop.
    function animate() {
        requestAnimationFrame(animate);

        controls.update()
        renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
}

main();
