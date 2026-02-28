class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.enemy = null;
        this.arena = null;
        this.clock = new THREE.Clock();
        
        // Игровые переменные
        this.playerHealth = 100;
        this.enemyHealth = 100;
        this.gameTime = 99;
        this.isPlaying = false;
        this.isPaused = false;
        
        // Управление
        this.keys = {};
        this.joystickActive = false;
        this.joystickData = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        // Создание сцены
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 50);
        
        // Камера
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 1, 0);
        
        // Рендерер
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('gameCanvas').appendChild(this.renderer.domElement);
        
        // Создание арены
        this.createArena();
        
        // Создание освещения
        this.createLights();
        
        // Создание персонажей
        this.createPlayer();
        this.createEnemy();
        
        // Настройка управления
        this.setupControls();
        
        // Адаптация при изменении размера
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createArena() {
        // Пол арены
        const floorGeometry = new THREE.PlaneGeometry(30, 30);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5016,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Сетка на полу
        const gridHelper = new THREE.GridHelper(30, 30, 0xffffff, 0x555555);
        this.scene.add(gridHelper);
        
        // Границы арены
        this.createArenaBorders();
        
        // Декорации
        this.createDecorations();
    }
    
    createArenaBorders() {
        const borderMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        const borderHeight = 3;
        const borderThickness = 0.5;
        
        // 4 стены
        const positions = [
            { x: 0, z: 15, rx: 0, ry: 0, w: 30, h: borderHeight },
            { x: 0, z: -15, rx: 0, ry: 0, w: 30, h: borderHeight },
            { x: 15, z: 0, rx: 0, ry: Math.PI / 2, w: 30, h: borderHeight },
            { x: -15, z: 0, rx: 0, ry: Math.PI / 2, w: 30, h: borderHeight }
        ];
        
        positions.forEach(pos => {
            const geometry = new THREE.PlaneGeometry(pos.w, pos.h);
            const border = new THREE.Mesh(geometry, borderMaterial);
            border.position.set(pos.x, pos.h / 2, pos.z);
            border.rotation.y = pos.ry;
            this.scene.add(border);
        });
    }
    
    createDecorations() {
        // Добавление столбов по углам
        const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.7
        });
        
        const pillarPositions = [
            { x: 12, z: 12 },
            { x: -12, z: 12 },
            { x: 12, z: -12 },
            { x: -12, z: -12 }
        ];
        
        pillarPositions.forEach(pos => {
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(pos.x, 2, pos.z);
            pillar.castShadow = true;
            this.scene.add(pillar);
            
            // Факелы на столбах
            const torchLight = new THREE.PointLight(0xff6600, 1, 10);
            torchLight.position.set(pos.x, 3.5, pos.z);
            torchLight.castShadow = true;
            this.scene.add(torchLight);
            
            // Анимация огня
            this.animateTorch(torchLight);
        });
    }
    
    animateTorch(light) {
        const originalIntensity = light.intensity;
        setInterval(() => {
            light.intensity = originalIntensity + Math.random() * 0.5;
        }, 100);
    }
    
    createLights() {
        // Направленный свет (солнце)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Ambient свет
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambientLight);
        
        // Hemisphere свет
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2d5016, 0.5);
        this.scene.add(hemisphereLight);
    }
    
    createPlayer() {
        // Создание простого персонажа (можно заменить на более сложную модель)
        const group = new THREE.Group();
        
        // Тело
        const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x0066ff });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.2;
        body.castShadow = true;
        group.add(body);
        
        // Голова
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.1;
        head.castShadow = true;
        group.add(head);
        
        // Руки
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.8, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0x0066ff });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.5, 1.2, 0);
        leftArm.castShadow = true;
        group.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.5, 1.2, 0);
        rightArm.castShadow = true;
        group.add(rightArm);
        
        // Ноги
        const legGeometry = new THREE.CylinderGeometry(0.12, 0.15, 1, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x003399 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.25, 0.5, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.25, 0.5, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);
        
        group.position.set(-3, 0, 0);
        this.scene.add(group);
        
        this.player = {
            mesh: group,
            body: body,
            head: head,
            leftArm: leftArm,
            rightArm: rightArm,
            leftLeg: leftLeg,
            rightLeg: rightLeg,
            velocity: new THREE.Vector3(),
            speed: 5,
            isAttacking: false,
            isBlocking: false
        };
    }
    
    createEnemy() {
        // Создание врага (похож на игрока, но другого цвета)
        const group = new THREE.Group();
        
        // Тело
        const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.2;
        body.castShadow = true;
        group.add(body);
        
        // Голова
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.1;
        head.castShadow = true;
        group.add(head);
        
        // Руки
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.8, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.5, 1.2, 0);
        leftArm.castShadow = true;
        group.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.5, 1.2, 0);
        rightArm.castShadow = true;
        group.add(rightArm);
        
        // Ноги
        const legGeometry = new THREE.CylinderGeometry(0.12, 0.15, 1, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x990000 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.25, 0.5, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.25, 0.5, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);
        
        group.position.set(3, 0, 0);
        group.rotation.y = Math.PI; // Повернут к игроку
        this.scene.add(group);
        
        this.enemy = {
            mesh: group,
            body: body,
            head: head,
            leftArm: leftArm,
            rightArm: rightArm,
            leftLeg: leftLeg,
            rightLeg: rightLeg,
            aiTimer: 0
        };
    }
    
    setupControls() {
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Атаки
            if (e.key === ' ') this.playerPunch();
            if (e.key === 'k') this.playerKick();
            if (e.key === 'l') this.playerSpecial();
            if (e.key === 'Shift') this.player.isBlocking = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            if (e.key === 'Shift') this.player.isBlocking = false;
        });
        
        // Мобильные кнопки
        this.setupMobileControls();
        
        // Пауза
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });
    }
    
    setupMobileControls() {
        // Джойстик
        const joystick = document.getElementById('joystick');
        const joystickKnob = joystick.querySelector('.joystick-knob');
        
        const handleJoystick = (e) => {
            e.preventDefault();
            const rect = joystick.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            let clientX, clientY;
            if (e.touches) {
                clientX = e.touches[0].clientX - rect.left;
                clientY = e.touches[0].clientY - rect.top;
            } else {
                clientX = e.clientX - rect.left;
                clientY = e.clientY - rect.top;
            }
            
            const deltaX = clientX - centerX;
            const deltaY = clientY - centerY;
            const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), centerX);
            const angle = Math.atan2(deltaY, deltaX);
            
            const knobX = Math.cos(angle) * distance;
            const knobY = Math.sin(angle) * distance;
            
            joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
            
            this.joystickData.x = knobX / centerX;
            this.joystickData.y = knobY / centerY;
            this.joystickActive = true;
        };
        
        const resetJoystick = () => {
            joystickKnob.style.transform = 'translate(-50%, -50%)';
            this.joystickData = { x: 0, y: 0 };
            this.joystickActive = false;
        };
        
        joystick.addEventListener('touchstart', handleJoystick);
        joystick.addEventListener('touchmove', handleJoystick);
        joystick.addEventListener('touchend', resetJoystick);
        joystick.addEventListener('mousedown', handleJoystick);
        joystick.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) handleJoystick(e);
        });
        joystick.addEventListener('mouseup', resetJoystick);
        
        // Кнопки действий
        document.getElementById('punchBtn').addEventListener('click', () => this.playerPunch());
        document.getElementById('kickBtn').addEventListener('click', () => this.playerKick());
        document.getElementById('specialBtn').addEventListener('click', () => this.playerSpecial());
        
        const blockBtn = document.getElementById('blockBtn');
        blockBtn.addEventListener('touchstart', () => this.player.isBlocking = true);
        blockBtn.addEventListener('touchend', () => this.player.isBlocking = false);
        blockBtn.addEventListener('mousedown', () => this.player.isBlocking = true);
        blockBtn.addEventListener('mouseup', () => this.player.isBlocking = false);
    }
    
    playerPunch() {
        if (this.player.isAttacking) return;
        
        this.player.isAttacking = true;
        
        // Анимация удара
        const originalRotation = this.player.rightArm.rotation.x;
        this.player.rightArm.rotation.x = -Math.PI / 2;
        this.player.rightArm.position.z = -0.5;
        
        // Проверка попадания
        const distance = this.player.mesh.position.distanceTo(this.enemy.mesh.position);
        if (distance < 2) {
            this.damageEnemy(10);
            this.createHitEffect(this.enemy.mesh.position);
        }
        
        setTimeout(() => {
            this.player.rightArm.rotation.x = originalRotation;
            this.player.rightArm.position.z = 0;
            this.player.isAttacking = false;
        }, 300);
    }
    
    playerKick() {
        if (this.player.isAttacking) return;
        
        this.player.isAttacking = true;
        
        // Анимация удара ногой
        const originalRotation = this.player.rightLeg.rotation.x;
        this.player.rightLeg.rotation.x = Math.PI / 3;
        
        const distance = this.player.mesh.position.distanceTo(this.enemy.mesh.position);
        if (distance < 2.5) {
            this.damageEnemy(15);
            this.createHitEffect(this.enemy.mesh.position);
        }
        
        setTimeout(() => {
            this.player.rightLeg.rotation.x = originalRotation;
            this.player.isAttacking = false;
        }, 400);
    }
    
    playerSpecial() {
        if (this.player.isAttacking) return;
        
        this.player.isAttacking = true;
        
        // Спецатака с эффектом
        this.createSpecialEffect(this.player.mesh.position);
        
        const distance = this.player.mesh.position.distanceTo(this.enemy.mesh.position);
        if (distance < 5) {
            this.damageEnemy(25);
            this.createHitEffect(this.enemy.mesh.position);
        }
        
        setTimeout(() => {
            this.player.isAttacking = false;
        }, 800);
    }
    
    damageEnemy(amount) {
        if (this.player.isBlocking) amount *= 0.5;
        
        this.enemyHealth = Math.max(0, this.enemyHealth - amount);
        this.updateHealthBar('enemy', this.enemyHealth);
        
        // Эффект получения урона
        this.enemy.body.material.emissive.setHex(0xff0000);
        setTimeout(() => {
            this.enemy.body.material.emissive.setHex(0x000000);
        }, 100);
        
        if (this.enemyHealth <= 0) {
            this.endGame('Победа!');
        }
    }
    
    damagePlayer(amount) {
        if (this.player.isBlocking) amount *= 0.5;
        
        this.playerHealth = Math.max(0, this.playerHealth - amount);
        this.updateHealthBar('player', this.playerHealth);
        
        this.player.body.material.emissive.setHex(0xff0000);
        setTimeout(() => {
            this.player.body.material.emissive.setHex(0x000000);
        }, 100);
        
        if (this.playerHealth <= 0) {
            this.endGame('Поражение!');
        }
    }
    
    createHitEffect(position) {
        // Частицы удара
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 20;
        const positions = new Float32Array(particlesCount * 3);
        
        for (let i = 0; i < particlesCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 0.5;
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particlesMaterial = new THREE.PointsMaterial({
            color: 0xffff00,
            size: 0.1,
            transparent: true
        });
        
        const particles = new THREE.Points(particlesGeometry, particlesMaterial);
        particles.position.copy(position);
        this.scene.add(particles);
        
        // Анимация исчезновения
        let opacity = 1;
        const interval = setInterval(() => {
            opacity -= 0.1;
            particlesMaterial.opacity = opacity;
            
            if (opacity <= 0) {
                clearInterval(interval);
                this.scene.remove(particles);
            }
        }, 50);
    }
    
    createSpecialEffect(position) {
        // Энергетическое кольцо
        const ringGeometry = new THREE.TorusGeometry(1, 0.1, 16, 100);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.position.y += 1;
        this.scene.add(ring);
        
        let scale = 0.1;
        let opacity = 0.8;
        const interval = setInterval(() => {
            scale += 0.2;
            opacity -= 0.08;
            ring.scale.set(scale, scale, scale);
            ringMaterial.opacity = opacity;
            
            if (opacity <= 0) {
                clearInterval(interval);
                this.scene.remove(ring);
            }
        }, 50);
    }
    
    updateHealthBar(type, health) {
        const healthBar = document.getElementById(type === 'player' ? 'playerHealth' : 'enemyHealth');
        healthBar.style.width = health + '%';
    }
    
    updatePlayerMovement(delta) {
        const moveSpeed = this.player.speed * delta;
        
        // Клавиатура
        if (this.keys['w'] || this.keys['arrowup']) {
            this.player.mesh.position.z -= moveSpeed;
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            this.player.mesh.position.z += moveSpeed;
        }
        if (this.keys['a'] || this.keys['arrowleft']) {
            this.player.mesh.position.x -= moveSpeed;
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            this.player.mesh.position.x += moveSpeed;
        }
        
        // Джойстик
        if (this.joystickActive) {
            this.player.mesh.position.x += this.joystickData.x * moveSpeed;
            this.player.mesh.position.z += this.joystickData.y * moveSpeed;
        }
        
        // Ограничение арены
        this.player.mesh.position.x = Math.max(-14, Math.min(14, this.player.mesh.position.x));
        this.player.mesh.position.z = Math.max(-14, Math.min(14, this.player.mesh.position.z));
        
        // Поворот к врагу
        this.player.mesh.lookAt(this.enemy.mesh.position);
    }
    
    updateEnemyAI(delta) {
        this.enemy.aiTimer += delta;
        
        // Простой AI - движение к игроку и атаки
        const distance = this.enemy.mesh.position.distanceTo(this.player.mesh.position);
        
        if (distance > 2) {
            // Движение к игроку
            const direction = new THREE.Vector3()
                .subVectors(this.player.mesh.position, this.enemy.mesh.position)
                .normalize();
            
            this.enemy.mesh.position.x += direction.x * 2 * delta;
            this.enemy.mesh.position.z += direction.z * 2 * delta;
        } else if (this.enemy.aiTimer > 1) {
            // Атака
            this.enemy.aiTimer = 0;
            this.enemyAttack();
        }
        
        // Поворот к игроку
        this.enemy.mesh.lookAt(this.player.mesh.position);
    }
    
    enemyAttack() {
        const attackType = Math.random();
        
        if (attackType < 0.5) {
            // Удар
            this.enemy.rightArm.rotation.x = -Math.PI / 2;
            setTimeout(() => {
                this.enemy.rightArm.rotation.x = 0;
            }, 300);
            this.damagePlayer(8);
        } else {
            // Удар ногой
            this.enemy.rightLeg.rotation.x = Math.PI / 3;
            setTimeout(() => {
                this.enemy.rightLeg.rotation.x = 0;
            }, 400);
            this.damagePlayer(12);
        }
        
        this.createHitEffect(this.player.mesh.position);
    }
    
    updateTimer(delta) {
        if (!this.isPlaying) return;
        
        this.gameTime -= delta;
        document.getElementById('timer').textContent = Math.ceil(this.gameTime);
        
        if (this.gameTime <= 0) {
            if (this.playerHealth > this.enemyHealth) {
                this.endGame('Победа по очкам!');
            } else if (this.enemyHealth > this.playerHealth) {
                this.endGame('Поражение по очкам!');
            } else {
                this.endGame('Ничья!');
            }
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? '▶️' : '⏸️';
    }
    
    endGame(message) {
        this.isPlaying = false;
        alert(message);
        
        // Возврат в меню
        setTimeout(() => {
            document.getElementById('gameContainer').style.display = 'none';
            document.getElementById('menu').style.display = 'flex';
            this.reset();
        }, 1000);
    }
    
    reset() {
        this.playerHealth = 100;
        this.enemyHealth = 100;
        this.gameTime = 99;
        this.updateHealthBar('player', 100);
        this.updateHealthBar('enemy', 100);
        this.player.mesh.position.set(-3, 0, 0);
        this.enemy.mesh.position.set(3, 0, 0);
    }
    
    start() {
        this.isPlaying = true;
        this.isPaused = false;
        this.reset();
        this.animate();
    }
    
    animate() {
        if (!this.isPlaying) return;
        
        requestAnimationFrame(() => this.animate());
        
        if (this.isPaused) return;
        
        const delta = this.clock.getDelta();
        
        this.updatePlayerMovement(delta);
        this.updateEnemyAI(delta);
        this.updateTimer(delta);
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}