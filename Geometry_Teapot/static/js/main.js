// main.js

import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TeapotGeometry } from 'three/addons/geometries/TeapotGeometry.js';

function main() {
    // Variables.
    let teapot;
    let effectController;
    const teapotSize = 300;
    let tess = - 1;
    let bBottom, bLid, bBody, bFitLid, bNonBlinn, shading;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Scene.
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xAAAAAA);

    // Camera.
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 80000);
    camera.position.set(- 600, 550, 1300);

    // Lights.
    const ambientLight = new THREE.AmbientLight(0x7c7c7c, 2.0);
    scene.add(ambientLight);
    const light = new THREE.DirectionalLight(0xFFFFFF, 2.0);
    light.position.set(0.32, 0.39, 0.7);
    scene.add(light);

    // Renderer.
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    const container = document.querySelector('#threejs-container');
    container.appendChild(renderer.domElement);

    // Orbit Controls.
    const cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.addEventListener('change', render);

    // Texture map.
    const textureMap = new THREE.TextureLoader().load('static/textures/uv_grid_opengl.jpg');
    textureMap.wrapS = textureMap.wrapT = THREE.RepeatWrapping;
    textureMap.anisotropy = 16;
    textureMap.colorSpace = THREE.SRGBColorSpace;

    // Reflection map.
    const path = 'static/textures/pisa/';
    const urls = ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'];

    // Texture cube.
    const textureCube = new THREE.CubeTextureLoader().setPath(path).load(urls);

    // Materials.
    const materials = {};
    materials['wireframe'] = new THREE.MeshBasicMaterial({ wireframe: true });
    materials['flat'] = new THREE.MeshPhongMaterial({ specular: 0x000000, flatShading: true, side: THREE.DoubleSide });
    materials['smooth'] = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    materials['glossy'] = new THREE.MeshPhongMaterial({ color: 0xc0c0c0, specular: 0x404040, shininess: 300, side: THREE.DoubleSide });
    materials['textured'] = new THREE.MeshPhongMaterial({ map: textureMap, side: THREE.DoubleSide });
    materials['reflective'] = new THREE.MeshPhongMaterial({ envMap: textureCube, side: THREE.DoubleSide });

    // GUI.
    function setupGui() {
        effectController = {
            newTess: 15,
            bottom: true,
            lid: true,
            body: true,
            fitLid: false,
            nonblinn: false,
            newShading: 'glossy'
        };

        const gui = new GUI();
        gui.add(effectController, 'newTess', [2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 50]).name('Tessellation Level').onChange(render);
        gui.add(effectController, 'lid').name('display lid').onChange(render);
        gui.add(effectController, 'body').name('display body').onChange(render);
        gui.add(effectController, 'bottom').name('display bottom').onChange(render);
        gui.add(effectController, 'fitLid').name('snug lid').onChange(render);
        gui.add(effectController, 'nonblinn').name('original scale').onChange(render);
        gui.add(effectController, 'newShading', ['wireframe', 'flat', 'smooth', 'glossy', 'textured', 'reflective']).name('Shading').onChange(render);
    }

    // Render the scene.
    function render() {
        if (effectController.newTess !== tess ||
            effectController.bottom !== bBottom ||
            effectController.lid !== bLid ||
            effectController.body !== bBody ||
            effectController.fitLid !== bFitLid ||
            effectController.nonblinn !== bNonBlinn ||
            effectController.newShading !== shading) {

            tess = effectController.newTess;
            bBottom = effectController.bottom;
            bLid = effectController.lid;
            bBody = effectController.body;
            bFitLid = effectController.fitLid;
            bNonBlinn = effectController.nonblinn;
            shading = effectController.newShading;

            createNewTeapot();
        }

        // Skybox is rendered behind the teapot.
        if (shading === 'reflective') {
            scene.background = textureCube;
        } else {
            scene.background = null;
        }
        renderer.render(scene, camera);
    }

    // Create new teapot.
    function createNewTeapot() {
        if (teapot !== undefined) {
            teapot.geometry.dispose();
            scene.remove(teapot);
        }

        const geometry = new TeapotGeometry(teapotSize,
            tess,
            effectController.bottom,
            effectController.lid,
            effectController.body,
            effectController.fitLid,
            !effectController.nonblinn);

        teapot = new THREE.Mesh(geometry, materials[shading]);
        scene.add(teapot);
    }

    // Window resize.
    window.addEventListener('resize', onWindowResize);
    function onWindowResize() {
        let width = window.innerWidth;
        let height = window.innerHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        render();
    }

    setupGui();
    render();
}

main();
