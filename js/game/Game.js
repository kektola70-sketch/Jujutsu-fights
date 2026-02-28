// ===== КЛАСС ИГРЫ =====

import { Character } from './Character.js';

export class Game {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        this.player = null;
        this.keys = {};
        
        this.init();
    }
    
    init() {
        // Сцена
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        
        // Камера
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 3, 8);
        this.camera.lookAt(0, 1.5, 0);
        
        // Рендерер
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Освещение
        this.setupLighting();
        
        // Пол
        this.createFloor();
        
        // Создаём персонажа
        this.player = new Character(this.scene, {
            name: 'Годжо Сатору',
            color: 0x0066ff,
            secondaryColor: 0x003399,
            hairColor: 0xffffff,
            position: { x: 0, y: 0, z: 0 }
        });
        
        // Управление
        this.setupControls();
        
        // Адаптация
        window.addEventListener('resize', () => this.onResize());
        
        // Запуск
        this.animate();
    }
    
    setupLighting() {
        // Ambient
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);
        
        // Directional
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 10, 5);
        directional.castShadow = true;
        directional.shadow.camera.left = -10;
        directional.shadow.camera.right = 10;
        directional.shadow.camera.top = 10;
        directional.shadow.camera.bottom = -10;
        directional.shadow.mapSize.width = 2048;
        directional.shadow.mapSize.height = 2048;
        this.scene.add(directional);
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(0x0066ff, 0.3);
        rimLight.position.set(-5, 5, -5);
        this.scene.add(rimLight);
    }
    
    createFloor() {
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Сетка
        const grid = new THREE.GridHelper(20, 20, 0x555555, 0x444444);
        this.scene.add(grid);
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Атаки
            if (e.code === 'KeyJ') this.player.punch();
            if (e.code === 'KeyK') this.player.kick();
            if (e.code === 'KeyL') this.player.special();
            if (e.code === 'Space') this.player.jump();
            if (e.code === 'ShiftLeft') this.player.block(true);
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ShiftLeft') this.player.block(false);
        });
    }
    
    update(delta) {
        // Движение
        const direction = { x: 0, z: 0 };
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) direction.z = -1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) direction.z = 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) direction.x = -1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) direction.x = 1;
        
        // Бег
        this.player.isRunning = this.keys['ShiftLeft'];
        
        this.player.move(direction);
        this.player.update(delta);
        
        // Камера следует за игроком
        this.camera.position.x = this.player.mesh.position.x;
        this.camera.lookAt(this.player.mesh.position.x, 1.5, this.player.mesh.position.z);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}