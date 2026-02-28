class Menu {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = [];
        
        this.init();
        this.setupEventListeners();
    }
    
    init() {
        // Создание 3D сцены для фона меню
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;
        
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('menuBackground').appendChild(this.renderer.domElement);
        
        // Создание анимированного фона
        this.createBackground();
        
        // Запуск анимации
        this.animate();
    }
    
    createBackground() {
        // Создание частиц
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        
        for (let i = 0; i < 1000; i++) {
            vertices.push(
                Math.random() * 20 - 10,
                Math.random() * 20 - 10,
                Math.random() * 20 - 10
            );
            
            const color = new THREE.Color();
            color.setHSL(Math.random() * 0.3 + 0.5, 1, 0.5);
            colors.push(color.r, color.g, color.b);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
        
        // Добавление света
        const light = new THREE.PointLight(0xffffff, 1, 100);
        light.position.set(0, 0, 10);
        this.scene.add(light);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Вращение частиц
        this.particles.rotation.x += 0.001;
        this.particles.rotation.y += 0.002;
        
        this.renderer.render(this.scene, this.camera);
    }
    
    setupEventListeners() {
        document.getElementById('playBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('charactersBtn').addEventListener('click', () => {
            alert('Выбор персонажей - в разработке!');
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            alert('Настройки - в разработке!');
        });
        
        document.getElementById('aboutBtn').addEventListener('click', () => {
            alert('Jujutsu Fight v1.0\nСоздано с использованием Three.js');
        });
        
        // Адаптация при изменении размера окна
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    startGame() {
        document.getElementById('menu').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
        
        // Запуск игры
        if (window.game) {
            window.game.start();
        }
    }
}