// ===== БАЗОВЫЙ КЛАСС ПЕРСОНАЖА =====

export class Character {
    constructor(scene, options = {}) {
        this.scene = scene;
        
        // Параметры персонажа
        this.name = options.name || 'Character';
        this.color = options.color || 0x0066ff;
        this.secondaryColor = options.secondaryColor || 0x003399;
        this.skinColor = options.skinColor || 0xffdbac;
        this.hairColor = options.hairColor || 0x222222;
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.scale = options.scale || 1;
        
        // Состояние персонажа
        this.health = 100;
        this.energy = 100;
        this.isAlive = true;
        this.isBlocking = false;
        this.isAttacking = false;
        this.isJumping = false;
        this.isRunning = false;
        this.direction = 1; // 1 = вправо, -1 = влево
        
        // Физика
        this.velocity = { x: 0, y: 0, z: 0 };
        this.gravity = -25;
        this.jumpForce = 10;
        this.moveSpeed = 5;
        this.runSpeed = 8;
        
        // Части тела (для анимаций)
        this.bodyParts = {};
        
        // Группа для всей модели
        this.mesh = new THREE.Group();
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        
        // Создаём модель
        this.createModel();
        
        // Добавляем на сцену
        this.scene.add(this.mesh);
        
        // Время для анимаций
        this.animationTime = 0;
        this.currentAnimation = 'idle';
    }
    
    createModel() {
        // ===== ТЕЛО =====
        const torsoGeometry = new THREE.BoxGeometry(0.8, 1.0, 0.4);
        const torsoMaterial = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.7,
            metalness: 0.1
        });
        this.bodyParts.torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
        this.bodyParts.torso.position.y = 1.5;
        this.bodyParts.torso.castShadow = true;
        this.mesh.add(this.bodyParts.torso);
        
        // ===== ГОЛОВА =====
        const headGroup = new THREE.Group();
        headGroup.position.y = 2.3;
        
        // Основа головы
        const headGeometry = new THREE.SphereGeometry(0.28, 32, 32);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: this.skinColor,
            roughness: 0.8
        });
        this.bodyParts.head = new THREE.Mesh(headGeometry, headMaterial);
        this.bodyParts.head.castShadow = true;
        headGroup.add(this.bodyParts.head);
        
        // Волосы
        const hairGeometry = new THREE.SphereGeometry(0.30, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const hairMaterial = new THREE.MeshStandardMaterial({ 
            color: this.hairColor,
            roughness: 0.9
        });
        this.bodyParts.hair = new THREE.Mesh(hairGeometry, hairMaterial);
        this.bodyParts.hair.position.y = 0.05;
        this.bodyParts.hair.castShadow = true;
        headGroup.add(this.bodyParts.hair);
        
        // Глаза
        const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pupilGeometry = new THREE.SphereGeometry(0.025, 16, 16);
        const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        // Левый глаз
        this.bodyParts.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.bodyParts.leftEye.position.set(-0.1, 0.05, 0.23);
        headGroup.add(this.bodyParts.leftEye);
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.1, 0.05, 0.27);
        headGroup.add(leftPupil);
        
        // Правый глаз
        this.bodyParts.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.bodyParts.rightEye.position.set(0.1, 0.05, 0.23);
        headGroup.add(this.bodyParts.rightEye);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.1, 0.05, 0.27);
        headGroup.add(rightPupil);
        
        // Рот
        const mouthGeometry = new THREE.BoxGeometry(0.1, 0.02, 0.02);
        const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
        this.bodyParts.mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        this.bodyParts.mouth.position.set(0, -0.1, 0.25);
        headGroup.add(this.bodyParts.mouth);
        
        this.bodyParts.headGroup = headGroup;
        this.mesh.add(headGroup);
        
        // ===== ПЛЕЧИ =====
        const shoulderGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const shoulderMaterial = new THREE.MeshStandardMaterial({ color: this.color });
        
        // Левое плечо
        this.bodyParts.leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        this.bodyParts.leftShoulder.position.set(-0.5, 1.9, 0);
        this.bodyParts.leftShoulder.castShadow = true;
        this.mesh.add(this.bodyParts.leftShoulder);
        
        // Правое плечо
        this.bodyParts.rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        this.bodyParts.rightShoulder.position.set(0.5, 1.9, 0);
        this.bodyParts.rightShoulder.castShadow = true;
        this.mesh.add(this.bodyParts.rightShoulder);
        
        // ===== РУКИ =====
        // Левая рука (группа для анимации)
        this.bodyParts.leftArmGroup = new THREE.Group();
        this.bodyParts.leftArmGroup.position.set(-0.5, 1.9, 0);
        
        const upperArmGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 16);
        const armMaterial = new THREE.MeshStandardMaterial({ color: this.color });
        
        this.bodyParts.leftUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
        this.bodyParts.leftUpperArm.position.y = -0.3;
        this.bodyParts.leftUpperArm.castShadow = true;
        this.bodyParts.leftArmGroup.add(this.bodyParts.leftUpperArm);
        
        // Локоть левый
        const elbowGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        this.bodyParts.leftElbow = new THREE.Mesh(elbowGeometry, armMaterial);
        this.bodyParts.leftElbow.position.y = -0.55;
        this.bodyParts.leftArmGroup.add(this.bodyParts.leftElbow);
        
        // Предплечье левое
        const forearmGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.45, 16);
        const forearmMaterial = new THREE.MeshStandardMaterial({ color: this.skinColor });
        
        this.bodyParts.leftForearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
        this.bodyParts.leftForearm.position.y = -0.8;
        this.bodyParts.leftForearm.castShadow = true;
        this.bodyParts.leftArmGroup.add(this.bodyParts.leftForearm);
        
        // Кулак левый
        const fistGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const fistMaterial = new THREE.MeshStandardMaterial({ color: this.skinColor });
        
        this.bodyParts.leftFist = new THREE.Mesh(fistGeometry, fistMaterial);
        this.bodyParts.leftFist.position.y = -1.05;
        this.bodyParts.leftFist.castShadow = true;
        this.bodyParts.leftArmGroup.add(this.bodyParts.leftFist);
        
        this.mesh.add(this.bodyParts.leftArmGroup);
        
        // Правая рука (группа для анимации)
        this.bodyParts.rightArmGroup = new THREE.Group();
        this.bodyParts.rightArmGroup.position.set(0.5, 1.9, 0);
        
        this.bodyParts.rightUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
        this.bodyParts.rightUpperArm.position.y = -0.3;
        this.bodyParts.rightUpperArm.castShadow = true;
        this.bodyParts.rightArmGroup.add(this.bodyParts.rightUpperArm);
        
        this.bodyParts.rightElbow = new THREE.Mesh(elbowGeometry, armMaterial);
        this.bodyParts.rightElbow.position.y = -0.55;
        this.bodyParts.rightArmGroup.add(this.bodyParts.rightElbow);
        
        this.bodyParts.rightForearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
        this.bodyParts.rightForearm.position.y = -0.8;
        this.bodyParts.rightForearm.castShadow = true;
        this.bodyParts.rightArmGroup.add(this.bodyParts.rightForearm);
        
        this.bodyParts.rightFist = new THREE.Mesh(fistGeometry, fistMaterial);
        this.bodyParts.rightFist.position.y = -1.05;
        this.bodyParts.rightFist.castShadow = true;
        this.bodyParts.rightArmGroup.add(this.bodyParts.rightFist);
        
        this.mesh.add(this.bodyParts.rightArmGroup);
        
        // ===== ПОЯС =====
        const beltGeometry = new THREE.BoxGeometry(0.85, 0.15, 0.45);
        const beltMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.bodyParts.belt = new THREE.Mesh(beltGeometry, beltMaterial);
        this.bodyParts.belt.position.y = 0.95;
        this.bodyParts.belt.castShadow = true;
        this.mesh.add(this.bodyParts.belt);
        
        // ===== НОГИ =====
        // Левая нога (группа для анимации)
        this.bodyParts.leftLegGroup = new THREE.Group();
        this.bodyParts.leftLegGroup.position.set(-0.2, 0.85, 0);
        
        const thighGeometry = new THREE.CylinderGeometry(0.13, 0.15, 0.5, 16);
        const legMaterial = new THREE.MeshStandardMaterial({ color: this.secondaryColor });
        
        this.bodyParts.leftThigh = new THREE.Mesh(thighGeometry, legMaterial);
        this.bodyParts.leftThigh.position.y = -0.3;
        this.bodyParts.leftThigh.castShadow = true;
        this.bodyParts.leftLegGroup.add(this.bodyParts.leftThigh);
        
        // Колено левое
        const kneeGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        this.bodyParts.leftKnee = new THREE.Mesh(kneeGeometry, legMaterial);
        this.bodyParts.leftKnee.position.y = -0.55;
        this.bodyParts.leftLegGroup.add(this.bodyParts.leftKnee);
        
        // Голень левая
        const shinGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 16);
        this.bodyParts.leftShin = new THREE.Mesh(shinGeometry, legMaterial);
        this.bodyParts.leftShin.position.y = -0.85;
        this.bodyParts.leftShin.castShadow = true;
        this.bodyParts.leftLegGroup.add(this.bodyParts.leftShin);
        
        // Ступня левая
        const footGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.3);
        const footMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
        this.bodyParts.leftFoot = new THREE.Mesh(footGeometry, footMaterial);
        this.bodyParts.leftFoot.position.set(0, -1.15, 0.05);
        this.bodyParts.leftFoot.castShadow = true;
        this.bodyParts.leftLegGroup.add(this.bodyParts.leftFoot);
        
        this.mesh.add(this.bodyParts.leftLegGroup);
        
        // Правая нога (группа для анимации)
        this.bodyParts.rightLegGroup = new THREE.Group();
        this.bodyParts.rightLegGroup.position.set(0.2, 0.85, 0);
        
        this.bodyParts.rightThigh = new THREE.Mesh(thighGeometry, legMaterial);
        this.bodyParts.rightThigh.position.y = -0.3;
        this.bodyParts.rightThigh.castShadow = true;
        this.bodyParts.rightLegGroup.add(this.bodyParts.rightThigh);
        
        this.bodyParts.rightKnee = new THREE.Mesh(kneeGeometry, legMaterial);
        this.bodyParts.rightKnee.position.y = -0.55;
        this.bodyParts.rightLegGroup.add(this.bodyParts.rightKnee);
        
        this.bodyParts.rightShin = new THREE.Mesh(shinGeometry, legMaterial);
        this.bodyParts.rightShin.position.y = -0.85;
        this.bodyParts.rightShin.castShadow = true;
        this.bodyParts.rightLegGroup.add(this.bodyParts.rightShin);
        
        this.bodyParts.rightFoot = new THREE.Mesh(footGeometry, footMaterial);
        this.bodyParts.rightFoot.position.set(0, -1.15, 0.05);
        this.bodyParts.rightFoot.castShadow = true;
        this.bodyParts.rightLegGroup.add(this.bodyParts.rightFoot);
        
        this.mesh.add(this.bodyParts.rightLegGroup);
        
        // ===== АУРА / ЭФФЕКТ ЭНЕРГИИ =====
        this.createAura();
        
        // Масштабирование
        this.mesh.scale.set(this.scale, this.scale, this.scale);
    }
    
    createAura() {
        // Аура вокруг персонажа (для спецприёмов)
        const auraGeometry = new THREE.SphereGeometry(1.2, 32, 32);
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0,
            side: THREE.BackSide
        });
        
        this.bodyParts.aura = new THREE.Mesh(auraGeometry, auraMaterial);
        this.bodyParts.aura.position.y = 1.5;
        this.mesh.add(this.bodyParts.aura);
    }
    
    // ===== АНИМАЦИИ =====
    
    update(delta) {
        this.animationTime += delta;
        
        // Применяем гравитацию
        if (this.mesh.position.y > 0 || this.velocity.y > 0) {
            this.velocity.y += this.gravity * delta;
            this.mesh.position.y += this.velocity.y * delta;
            
            if (this.mesh.position.y <= 0) {
                this.mesh.position.y = 0;
                this.velocity.y = 0;
                this.isJumping = false;
            }
        }
        
        // Движение
        this.mesh.position.x += this.velocity.x * delta;
        this.mesh.position.z += this.velocity.z * delta;
        
        // Анимация в зависимости от состояния
        switch (this.currentAnimation) {
            case 'idle':
                this.animateIdle(delta);
                break;
            case 'walk':
                this.animateWalk(delta);
                break;
            case 'run':
                this.animateRun(delta);
                break;
            case 'jump':
                this.animateJump(delta);
                break;
            case 'punch':
                this.animatePunch(delta);
                break;
            case 'kick':
                this.animateKick(delta);
                break;
            case 'special':
                this.animateSpecial(delta);
                break;
            case 'block':
                this.animateBlock(delta);
                break;
            case 'hit':
                this.animateHit(delta);
                break;
        }
    }
    
    animateIdle(delta) {
        const breathe = Math.sin(this.animationTime * 2) * 0.02;
        
        // Дыхание - движение тела вверх-вниз
        this.bodyParts.torso.position.y = 1.5 + breathe;
        this.bodyParts.headGroup.position.y = 2.3 + breathe;
        
        // Лёгкое покачивание рук
        const armSwing = Math.sin(this.animationTime * 1.5) * 0.05;
        this.bodyParts.leftArmGroup.rotation.x = armSwing;
        this.bodyParts.rightArmGroup.rotation.x = -armSwing;
        
        // Руки в боевой стойке
        this.bodyParts.leftArmGroup.rotation.z = 0.3;
        this.bodyParts.rightArmGroup.rotation.z = -0.3;
        this.bodyParts.leftArmGroup.rotation.x = -0.5;
        this.bodyParts.rightArmGroup.rotation.x = -0.5;
    }
    
    animateWalk(delta) {
        const walkSpeed = 8;
        const legSwing = Math.sin(this.animationTime * walkSpeed) * 0.5;
        const armSwing = Math.sin(this.animationTime * walkSpeed) * 0.3;
        
        // Ноги
        this.bodyParts.leftLegGroup.rotation.x = legSwing;
        this.bodyParts.rightLegGroup.rotation.x = -legSwing;
        
        // Руки (противоположно ногам)
        this.bodyParts.leftArmGroup.rotation.x = -armSwing - 0.3;
        this.bodyParts.rightArmGroup.rotation.x = armSwing - 0.3;
        
        // Небольшое покачивание тела
        const bodyBounce = Math.abs(Math.sin(this.animationTime * walkSpeed * 2)) * 0.05;
        this.bodyParts.torso.position.y = 1.5 + bodyBounce;
    }
    
    animateRun(delta) {
        const runSpeed = 12;
        const legSwing = Math.sin(this.animationTime * runSpeed) * 0.7;
        const armSwing = Math.sin(this.animationTime * runSpeed) * 0.6;
        
        // Ноги - более широкий размах
        this.bodyParts.leftLegGroup.rotation.x = legSwing;
        this.bodyParts.rightLegGroup.rotation.x = -legSwing;
        
        // Руки
        this.bodyParts.leftArmGroup.rotation.x = -armSwing - 0.5;
        this.bodyParts.rightArmGroup.rotation.x = armSwing - 0.5;
        this.bodyParts.leftArmGroup.rotation.z = 0.2;
        this.bodyParts.rightArmGroup.rotation.z = -0.2;
        
        // Наклон вперёд при беге
        this.bodyParts.torso.rotation.x = 0.1;
        
        // Более выраженное покачивание
        const bodyBounce = Math.abs(Math.sin(this.animationTime * runSpeed * 2)) * 0.08;
        this.bodyParts.torso.position.y = 1.5 + bodyBounce;
    }
    
    animateJump(delta) {
        // Подтянутые ноги в прыжке
        this.bodyParts.leftLegGroup.rotation.x = -0.5;
        this.bodyParts.rightLegGroup.rotation.x = -0.3;
        
        // Руки вверх
        this.bodyParts.leftArmGroup.rotation.x = -1;
        this.bodyParts.rightArmGroup.rotation.x = -1;
        this.bodyParts.leftArmGroup.rotation.z = 0.5;
        this.bodyParts.rightArmGroup.rotation.z = -0.5;
    }
    
    animatePunch(delta) {
        // Удар правой рукой
        this.bodyParts.rightArmGroup.rotation.x = -1.5;
        this.bodyParts.rightArmGroup.rotation.z = 0;
        this.bodyParts.rightArmGroup.position.z = 0.3;
        
        // Левая рука назад
        this.bodyParts.leftArmGroup.rotation.x = 0.3;
        this.bodyParts.leftArmGroup.rotation.z = 0.5;
        
        // Поворот тела
        this.bodyParts.torso.rotation.y = -0.3 * this.direction;
    }
    
    animateKick(delta) {
        // Удар правой ногой
        this.bodyParts.rightLegGroup.rotation.x = 1.2;
        this.bodyParts.rightLegGroup.position.z = 0.3;
        
        // Левая нога - опора
        this.bodyParts.leftLegGroup.rotation.x = -0.2;
        
        // Наклон назад
        this.bodyParts.torso.rotation.x = -0.2;
        
        // Руки для баланса
        this.bodyParts.leftArmGroup.rotation.x = -0.5;
        this.bodyParts.rightArmGroup.rotation.x = -0.5;
        this.bodyParts.leftArmGroup.rotation.z = 0.8;
        this.bodyParts.rightArmGroup.rotation.z = -0.8;
    }
    
    animateSpecial(delta) {
        // Эпичная поза для спецприёма
        const pulse = Math.sin(this.animationTime * 10) * 0.1 + 0.3;
        
        // Аура
        this.bodyParts.aura.material.opacity = pulse;
        this.bodyParts.aura.scale.set(1 + pulse * 0.5, 1 + pulse * 0.5, 1 + pulse * 0.5);
        
        // Руки сложены вместе
        this.bodyParts.leftArmGroup.rotation.x = -1.2;
        this.bodyParts.rightArmGroup.rotation.x = -1.2;
        this.bodyParts.leftArmGroup.rotation.z = -0.3;
        this.bodyParts.rightArmGroup.rotation.z = 0.3;
        
        // Широкая стойка
        this.bodyParts.leftLegGroup.rotation.z = -0.2;
        this.bodyParts.rightLegGroup.rotation.z = 0.2;
    }
    
    animateBlock(delta) {
        // Защитная стойка
        this.bodyParts.leftArmGroup.rotation.x = -1.3;
        this.bodyParts.rightArmGroup.rotation.x = -1.3;
        this.bodyParts.leftArmGroup.rotation.z = -0.2;
        this.bodyParts.rightArmGroup.rotation.z = 0.2;
        
        // Присесть
        this.bodyParts.leftLegGroup.rotation.x = 0.3;
        this.bodyParts.rightLegGroup.rotation.x = 0.3;
        this.bodyParts.torso.position.y = 1.3;
        this.bodyParts.headGroup.position.y = 2.1;
    }
    
    animateHit(delta) {
        // Получение урона
        const shake = Math.sin(this.animationTime * 30) * 0.1;
        this.mesh.position.x += shake;
        
        // Откидывание назад
        this.bodyParts.torso.rotation.x = -0.3;
        this.bodyParts.headGroup.rotation.x = 0.3;
    }
    
    // ===== МЕТОДЫ УПРАВЛЕНИЯ =====
    
    setAnimation(animationName) {
        if (this.currentAnimation !== animationName) {
            this.currentAnimation = animationName;
            this.resetPose();
        }
    }
    
    resetPose() {
        // Сброс всех позиций и поворотов к начальным
        this.bodyParts.torso.position.y = 1.5;
        this.bodyParts.torso.rotation.set(0, 0, 0);
        this.bodyParts.headGroup.position.y = 2.3;
        this.bodyParts.headGroup.rotation.set(0, 0, 0);
        
        this.bodyParts.leftArmGroup.position.set(-0.5, 1.9, 0);
        this.bodyParts.leftArmGroup.rotation.set(0, 0, 0);
        this.bodyParts.rightArmGroup.position.set(0.5, 1.9, 0);
        this.bodyParts.rightArmGroup.rotation.set(0, 0, 0);
        
        this.bodyParts.leftLegGroup.position.set(-0.2, 0.85, 0);
        this.bodyParts.leftLegGroup.rotation.set(0, 0, 0);
        this.bodyParts.rightLegGroup.position.set(0.2, 0.85, 0);
        this.bodyParts.rightLegGroup.rotation.set(0, 0, 0);
        
        this.bodyParts.aura.material.opacity = 0;
    }
    
    move(direction) {
        const speed = this.isRunning ? this.runSpeed : this.moveSpeed;
        this.velocity.x = direction.x * speed;
        this.velocity.z = direction.z * speed;
        
        // Поворот в направлении движения
        if (direction.x !== 0) {
            this.direction = direction.x > 0 ? 1 : -1;
            this.mesh.rotation.y = direction.x > 0 ? 0 : Math.PI;
        }
        
        if (direction.x !== 0 || direction.z !== 0) {
            