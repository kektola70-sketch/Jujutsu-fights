// ===== КЛАСС ПРИЛОЖЕНИЯ =====
class JujutsuFight {
    constructor() {
        this.currentScreen = 'mainMenu';
        this.selectedCharacter = null;
        this.settings = this.loadSettings();
        
        this.init();
    }
    
    init() {
        this.setup3DBackground();
        this.setupNavigation();
        this.setupCharacters();
        this.setupSettings();
        this.applySettings();
        
        console.log('🎮 Jujutsu Fight запущена!');
    }
    
    // ===== 3D ФОН =====
    setup3DBackground() {
        const container = document.getElementById('background3D');
        
        // Сцена
        this.scene = new THREE.Scene();
        
        // Камера
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;
        
        // Рендерер
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x0a0a0f, 1);
        container.appendChild(this.renderer.domElement);
        
        // Создание частиц
        this.createParticles();
        
        // Создание геометрических фигур
        this.createShapes();
        
        // Запуск анимации
        this.animate();
        
        // Обработка ресайза
        window.addEventListener('resize', () => this.onResize());
    }
    
    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const count = 1500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        
        for (let i = 0; i < count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 25;
            positions[i + 1] = (Math.random() - 0.5) * 25;
            positions[i + 2] = (Math.random() - 0.5) * 25;
            
            // Градиент цветов
            const color = new THREE.Color();
            color.setHSL(0.6 + Math.random() * 0.3, 0.8, 0.5);
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }
    
    createShapes() {
        this.shapes = [];
        
        // Создание нескольких геометрических фигур
        const geometries = [
            new THREE.OctahedronGeometry(0.5),
            new THREE.TetrahedronGeometry(0.4),
            new THREE.IcosahedronGeometry(0.3)
        ];
        
        for (let i = 0; i < 8; i++) {
            const geometry = geometries[i % geometries.length];
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0.6 + Math.random() * 0.3, 0.8, 0.5),
                wireframe: true,
                transparent: true,
                opacity: 0.3
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 5
            );
            
            mesh.userData = {
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.02,
                    y: (Math.random() - 0.5) * 0.02
                },
                floatSpeed: Math.random() * 0.5 + 0.5,
                floatOffset: Math.random() * Math.PI * 2
            };
            
            this.shapes.push(mesh);
            this.scene.add(mesh);
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = Date.now() * 0.001;
        
        // Анимация частиц
        if (this.particles) {
            this.particles.rotation.x += 0.0003;
            this.particles.rotation.y += 0.0005;
        }
        
        // Анимация фигур
        this.shapes.forEach(shape => {
            shape.rotation.x += shape.userData.rotationSpeed.x;
            shape.rotation.y += shape.userData.rotationSpeed.y;
            shape.position.y += Math.sin(time * shape.userData.floatSpeed + shape.userData.floatOffset) * 0.002;
        });
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // ===== НАВИГАЦИЯ =====
    setupNavigation() {
        // Главное меню
        document.getElementById('playBtn').addEventListener('click', () => {
            this.showNotification('🎮 Игра в разработке!');
        });
        
        document.getElementById('charactersBtn').addEventListener('click', () => {
            this.navigateTo('charactersScreen');
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.navigateTo('settingsScreen');
        });
        
        document.getElementById('aboutBtn').addEventListener('click', () => {
            this.navigateTo('aboutScreen');
        });
        
        // Кнопки "Назад"
        document.getElementById('backFromCharacters').addEventListener('click', () => {
            this.navigateTo('mainMenu');
        });
        
        document.getElementById('backFromSettings').addEventListener('click', () => {
            this.navigateTo('mainMenu');
        });
        
        document.getElementById('backFromAbout').addEventListener('click', () => {
            this.navigateTo('mainMenu');
        });
    }
    
    navigateTo(screenId) {
        // Скрываем текущий экран
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen) {
            currentScreen.classList.remove('active');
            setTimeout(() => {
                currentScreen.style.display = 'none';
            }, 300);
        }
        
        // Показываем новый экран
        setTimeout(() => {
            const newScreen = document.getElementById(screenId);
            newScreen.style.display = 'flex';
            setTimeout(() => {
                newScreen.classList.add('active');
            }, 50);
        }, 300);
        
        this.currentScreen = screenId;
    }
    
    // ===== ПЕРСОНАЖИ =====
    setupCharacters() {
        const cards = document.querySelectorAll('.character-card');
        
        cards.forEach(card => {
            card.addEventListener('click', () => {
                if (card.classList.contains('locked')) {
                    this.showNotification('🔒 Персонаж заблокирован!');
                    return;
                }
                
                // Убираем выделение с других карточек
                cards.forEach(c => c.classList.remove('selected'));
                
                // Выделяем текущую
                card.classList.add('selected');
                
                const characterName = card.querySelector('.character-name').textContent;
                this.selectedCharacter = card.dataset.character;
                this.showNotification(`✓ Выбран: ${characterName}`);
            });
        });
    }
    
    // ===== НАСТРОЙКИ =====
    setupSettings() {
        // Громкость музыки
        const musicSlider = document.getElementById('musicVolume');
        const musicValue = document.getElementById('musicValue');
        musicSlider.addEventListener('input', (e) => {
            musicValue.textContent = e.target.value + '%';
            this.settings.musicVolume = parseInt(e.target.value);
        });
        
        // Громкость звуков
        const sfxSlider = document.getElementById('sfxVolume');
        const sfxValue = document.getElementById('sfxValue');
        sfxSlider.addEventListener('input', (e) => {
            sfxValue.textContent = e.target.value + '%';
            this.settings.sfxVolume = parseInt(e.target.value);
        });
        
        // Вибрация
        document.getElementById('vibrationToggle').addEventListener('change', (e) => {
            this.settings.vibration = e.target.checked;
        });
        
        // Качество графики
        document.getElementById('graphicsQuality').addEventListener('change', (e) => {
            this.settings.graphicsQuality = e.target.value;
        });
        
        // Язык
        document.getElementById('language').addEventListener('change', (e) => {
            this.settings.language = e.target.value;
        });
        
        // Сложность
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.settings.difficulty = e.target.value;
        });
        
        // Сохранить
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
            this.showNotification('💾 Настройки сохранены!');
        });
        
        // Сбросить
        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
            this.showNotification('🔄 Настройки сброшены!');
        });
    }
    
    loadSettings() {
        const saved = localStorage.getItem('jujutsuFightSettings');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            musicVolume: 70,
            sfxVolume: 80,
            vibration: true,
            graphicsQuality: 'medium',
            language: 'ru',
            difficulty: 'normal'
        };
    }
    
    saveSettings() {
        localStorage.setItem('jujutsuFightSettings', JSON.stringify(this.settings));
    }
    
    applySettings() {
        document.getElementById('musicVolume').value = this.settings.musicVolume;
        document.getElementById('musicValue').textContent = this.settings.musicVolume + '%';
        
        document.getElementById('sfxVolume').value = this.settings.sfxVolume;
        document.getElementById('sfxValue').textContent = this.settings.sfxVolume + '%';
        
        document.getElementById('vibrationToggle').checked = this.settings.vibration;
        document.getElementById('graphicsQuality').value = this.settings.graphicsQuality;
        document.getElementById('language').value = this.settings.language;
        document.getElementById('difficulty').value = this.settings.difficulty;
    }
    
    resetSettings() {
        this.settings = {
            musicVolume: 70,
            sfxVolume: 80,
            vibration: true,
            graphicsQuality: 'medium',
            language: 'ru',
            difficulty: 'normal'
        };
        this.applySettings();
        this.saveSettings();
    }
    
    // ===== УВЕДОМЛЕНИЯ =====
    showNotification(text) {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        notificationText.textContent = text;
        notification.classList.add('show');
        
        // Вибрация на мобильных
        if (this.settings.vibration && navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2500);
    }
}

// ===== ЗАПУСК =====
window.addEventListener('DOMContentLoaded', () => {
    window.app = new JujutsuFight();
});