// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInWithPopup,
    signInAnonymously,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyD6ReDa8vH044Yun5CkkzGNISuMDp4rtW8",
    authDomain: "jujutsu-fight.firebaseapp.com",
    projectId: "jujutsu-fight",
    storageBucket: "jujutsu-fight.firebasestorage.app",
    messagingSenderId: "506548974802",
    appId: "1:506548974802:web:3ac719e1381d561973290b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== CAMERA CONTROLLER =====
class CameraController {
    constructor(camera, target, domElement) {
        this.camera = camera;
        this.target = target;
        this.domElement = domElement;
        
        this.distance = 8;
        this.minDistance = 4;
        this.maxDistance = 15;
        
        this.theta = 0; // Горизонтальный угол
        this.phi = Math.PI / 6; // Вертикальный угол
        this.minPhi = 0.1;
        this.maxPhi = Math.PI / 2.5;
        
        this.rotateSpeed = 0.005;
        this.zoomSpeed = 0.001;
        
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        
        this.targetPosition = new THREE.Vector3();
        
        this.setupEvents();
        this.update();
    }
    
    setupEvents() {
        // Mouse events
        this.domElement.addEventListener('mousedown', (e) => {
            if (e.button === 2 || e.button === 1) { // Right or middle click
                this.isDragging = true;
                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });
        
        this.domElement.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.previousMousePosition.x;
                const deltaY = e.clientY - this.previousMousePosition.y;
                
                this.theta -= deltaX * this.rotateSpeed;
                this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi + deltaY * this.rotateSpeed));
                
                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });
        
        this.domElement.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        this.domElement.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });
        
        // Wheel zoom
        this.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, 
                this.distance + e.deltaY * this.zoomSpeed * 10));
        });
        
        // Touch events
        let touchStartDistance = 0;
        let touchStartTheta = 0;
        let touchStartPhi = 0;
        
        this.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                touchStartDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                touchStartTheta = this.theta;
                touchStartPhi = this.phi;
            }
        });
        
        this.domElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 1 && this.isDragging) {
                const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
                const deltaY = e.touches[0].clientY - this.previousMousePosition.y;
                
                this.theta -= deltaX * this.rotateSpeed * 2;
                this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi + deltaY * this.rotateSpeed * 2));
                
                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                
                const scale = touchStartDistance / currentDistance;
                this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, 
                    this.distance * scale * 0.1 + this.distance * 0.9));
            }
        });
        
        this.domElement.addEventListener('touchend', () => {
            this.isDragging = false;
        });
        
        // Prevent context menu
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setTarget(position) {
        this.targetPosition.copy(position);
    }
    
    update() {
        const x = this.targetPosition.x + this.distance * Math.sin(this.phi) * Math.sin(this.theta);
        const y = this.targetPosition.y + this.distance * Math.cos(this.phi);
        const z = this.targetPosition.z + this.distance * Math.sin(this.phi) * Math.cos(this.theta);
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.targetPosition.x, this.targetPosition.y + 1.5, this.targetPosition.z);
    }
}

// ===== CHARACTER CLASS =====
class Character {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.name = options.name || 'Character';
        this.color = options.color || 0x0066ff;
        this.secondaryColor = options.secondaryColor || 0x003399;
        this.skinColor = options.skinColor || 0xffdbac;
        this.hairColor = options.hairColor || 0x222222;
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.characterType = options.characterType || 'default';
        
        this.health = 100;
        this.maxHealth = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        this.isAlive = true;
        this.isBlocking = false;
        this.isAttacking = false;
        this.isJumping = false;
        this.isDodging = false;
        this.direction = 1;
        this.isDomainActive = false;
        
        this.velocity = { x: 0, y: 0, z: 0 };
        this.gravity = -25;
        this.jumpForce = 10;
        this.moveSpeed = 5;
        
        this.bodyParts = {};
        this.mesh = new THREE.Group();
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        
        this.createModel();
        this.scene.add(this.mesh);
        
        this.animationTime = 0;
        this.currentAnimation = 'idle';
        
        // Domain expansion
        this.domainMesh = null;
    }
    
    createModel() {
        // Тело
        const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4);
        const torsoMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.7 });
        this.bodyParts.torso = new THREE.Mesh(torsoGeo, torsoMat);
        this.bodyParts.torso.position.y = 1.5;
        this.bodyParts.torso.castShadow = true;
        this.mesh.add(this.bodyParts.torso);
        
        // Голова
        const headGroup = new THREE.Group();
        headGroup.position.y = 2.3;
        
        const headGeo = new THREE.SphereGeometry(0.28, 32, 32);
        const headMat = new THREE.MeshStandardMaterial({ color: this.skinColor });
        this.bodyParts.head = new THREE.Mesh(headGeo, headMat);
        this.bodyParts.head.castShadow = true;
        headGroup.add(this.bodyParts.head);
        
        // Волосы
        const hairGeo = new THREE.SphereGeometry(0.30, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const hairMat = new THREE.MeshStandardMaterial({ color: this.hairColor });
        this.bodyParts.hair = new THREE.Mesh(hairGeo, hairMat);
        this.bodyParts.hair.position.y = 0.05;
        headGroup.add(this.bodyParts.hair);
        
        // Глаза - особые для Годжо и Сукуны
        const eyeGeo = new THREE.SphereGeometry(0.05, 16, 16);
        let eyeColor = 0xffffff;
        let pupilColor = 0x000000;
        
        if (this.characterType === 'gojo') {
            pupilColor = 0x00bfff; // Голубые глаза Годжо
        } else if (this.characterType === 'sukuna') {
            pupilColor = 0xff0000; // Красные глаза Сукуны
            // Дополнительные глаза для Сукуны
            this.createExtraEyes(headGroup);
        }
        
        const eyeMat = new THREE.MeshStandardMaterial({ color: eyeColor });
        const pupilGeo = new THREE.SphereGeometry(0.03, 16, 16);
        const pupilMat = new THREE.MeshStandardMaterial({ color: pupilColor, emissive: pupilColor, emissiveIntensity: 0.3 });
        
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.1, 0.05, 0.23);
        headGroup.add(leftEye);
        
        const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
        leftPupil.position.set(-0.1, 0.05, 0.27);
        headGroup.add(leftPupil);
        
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.1, 0.05, 0.23);
        headGroup.add(rightEye);
        
        const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rightPupil.position.set(0.1, 0.05, 0.27);
        headGroup.add(rightPupil);
        
        this.bodyParts.headGroup = headGroup;
        this.mesh.add(headGroup);
        
        // Руки
        this.bodyParts.leftArmGroup = this.createArm(-0.5);
        this.bodyParts.rightArmGroup = this.createArm(0.5);
        
        // Пояс
        const beltGeo = new THREE.BoxGeometry(0.85, 0.15, 0.45);
        const beltMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.bodyParts.belt = new THREE.Mesh(beltGeo, beltMat);
        this.bodyParts.belt.position.y = 0.95;
        this.mesh.add(this.bodyParts.belt);
        
        // Ноги
        this.bodyParts.leftLegGroup = this.createLeg(-0.2);
        this.bodyParts.rightLegGroup = this.createLeg(0.2);
        
        // Аура
        const auraGeo = new THREE.SphereGeometry(1.2, 32, 32);
        const auraMat = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0,
            side: THREE.BackSide
        });
        this.bodyParts.aura = new THREE.Mesh(auraGeo, auraMat);
        this.bodyParts.aura.position.y = 1.5;
        this.mesh.add(this.bodyParts.aura);
        
        // Татуировки для Сукуны
        if (this.characterType === 'sukuna') {
            this.createSukunaTattoos();
        }
    }
    
    createExtraEyes(headGroup) {
        // Дополнительная пара глаз для Сукуны на лбу
        const eyeGeo = new THREE.SphereGeometry(0.035, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pupilGeo = new THREE.SphereGeometry(0.02, 16, 16);
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
        
        const leftExtraEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftExtraEye.position.set(-0.08, 0.18, 0.2);
        headGroup.add(leftExtraEye);
        
        const leftExtraPupil = new THREE.Mesh(pupilGeo, pupilMat);
        leftExtraPupil.position.set(-0.08, 0.18, 0.23);
        headGroup.add(leftExtraPupil);
        
        const rightExtraEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightExtraEye.position.set(0.08, 0.18, 0.2);
        headGroup.add(rightExtraEye);
        
        const rightExtraPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rightExtraPupil.position.set(0.08, 0.18, 0.23);
        headGroup.add(rightExtraPupil);
    }
    
    createSukunaTattoos() {
        // Линии на лице
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        // Линии на щеках
        for (let i = 0; i < 2; i++) {
            const lineGeo = new THREE.BoxGeometry(0.02, 0.15, 0.01);
            const line = new THREE.Mesh(lineGeo, lineMaterial);
            line.position.set(i === 0 ? -0.15 : 0.15, 2.25, 0.25);
            this.mesh.add(line);
        }
    }
    
    createArm(xPos) {
        const group = new THREE.Group();
        group.position.set(xPos, 1.9, 0);
        
        const armMat = new THREE.MeshStandardMaterial({ color: this.color });
        const skinMat = new THREE.MeshStandardMaterial({ color: this.skinColor });
        
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 16), armMat);
        upperArm.position.y = -0.3;
        upperArm.castShadow = true;
        group.add(upperArm);
        
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), armMat);
        elbow.position.y = -0.55;
        group.add(elbow);
        
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.45, 16), skinMat);
        forearm.position.y = -0.8;
        forearm.castShadow = true;
        group.add(forearm);
        
        const fist = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), skinMat);
        fist.position.y = -1.05;
        fist.castShadow = true;
        group.add(fist);
        
        this.mesh.add(group);
        return group;
    }
    
    createLeg(xPos) {
        const group = new THREE.Group();
        group.position.set(xPos, 0.85, 0);
        
        const legMat = new THREE.MeshStandardMaterial({ color: this.secondaryColor });
        const footMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.5, 16), legMat);
        thigh.position.y = -0.3;
        thigh.castShadow = true;
        group.add(thigh);
        
        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), legMat);
        knee.position.y = -0.55;
        group.add(knee);
        
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 16), legMat);
        shin.position.y = -0.85;
        shin.castShadow = true;
        group.add(shin);
        
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.3), footMat);
        foot.position.set(0, -1.15, 0.05);
        foot.castShadow = true;
        group.add(foot);
        
        this.mesh.add(group);
        return group;
    }
    
    update(delta) {
        this.animationTime += delta;
        
        // Регенерация энергии
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.maxEnergy, this.energy + 5 * delta);
        }
        
        // Гравитация
        if (this.mesh.position.y > 0 || this.velocity.y > 0) {
            this.velocity.y += this.gravity * delta;
            this.mesh.position.y += this.velocity.y * delta;
            
            if (this.mesh.position.y <= 0) {
                this.mesh.position.y = 0;
                this.velocity.y = 0;
                this.isJumping = false;
            }
        }
        
        this.mesh.position.x += this.velocity.x * delta;
        this.mesh.position.z += this.velocity.z * delta;
        
        // Ограничение арены
        this.mesh.position.x = Math.max(-14, Math.min(14, this.mesh.position.x));
        this.mesh.position.z = Math.max(-14, Math.min(14, this.mesh.position.z));
        
        // Анимации
        switch (this.currentAnimation) {
            case 'idle': this.animateIdle(); break;
            case 'walk': this.animateWalk(); break;
            case 'run': this.animateRun(); break;
            case 'jump': this.animateJump(); break;
            case 'punch': this.animatePunch(); break;
            case 'kick': this.animateKick(); break;
            case 'special': this.animateSpecial(); break;
            case 'block': this.animateBlock(); break;
            case 'dodge': this.animateDodge(); break;
            case 'domain': this.animateDomain(); break;
            case 'hit': this.animateHit(); break;
        }
        
        // Domain expansion эффект
        if (this.domainMesh) {
            this.domainMesh.rotation.y += delta * 0.5;
        }
    }
    
    animateIdle() {
        const breathe = Math.sin(this.animationTime * 2) * 0.02;
        this.bodyParts.torso.position.y = 1.5 + breathe;
        this.bodyParts.headGroup.position.y = 2.3 + breathe;
        
        this.bodyParts.leftArmGroup.rotation.z = 0.3;
        this.bodyParts.rightArmGroup.rotation.z = -0.3;
        this.bodyParts.leftArmGroup.rotation.x = -0.5;
        this.bodyParts.rightArmGroup.rotation.x = -0.5;
    }
    
    animateWalk() {
        const swing = Math.sin(this.animationTime * 8) * 0.5;
        this.bodyParts.leftLegGroup.rotation.x = swing;
        this.bodyParts.rightLegGroup.rotation.x = -swing;
        this.bodyParts.leftArmGroup.rotation.x = -swing * 0.6 - 0.3;
        this.bodyParts.rightArmGroup.rotation.x = swing * 0.6 - 0.3;
    }
    
    animateRun() {
        const swing = Math.sin(this.animationTime * 12) * 0.7;
        this.bodyParts.leftLegGroup.rotation.x = swing;
        this.bodyParts.rightLegGroup.rotation.x = -swing;
        this.bodyParts.leftArmGroup.rotation.x = -swing * 0.8 - 0.5;
        this.bodyParts.rightArmGroup.rotation.x = swing * 0.8 - 0.5;
        this.bodyParts.torso.rotation.x = 0.1;
    }
    
    animateJump() {
        this.bodyParts.leftLegGroup.rotation.x = -0.5;
        this.bodyParts.rightLegGroup.rotation.x = -0.3;
        this.bodyParts.leftArmGroup.rotation.x = -1;
        this.bodyParts.rightArmGroup.rotation.x = -1;
    }
    
    animatePunch() {
        this.bodyParts.rightArmGroup.rotation.x = -1.5;
        this.bodyParts.rightArmGroup.rotation.z = 0;
        this.bodyParts.torso.rotation.y = -0.3 * this.direction;
    }
    
    animateKick() {
        this.bodyParts.rightLegGroup.rotation.x = 1.2;
        this.bodyParts.torso.rotation.x = -0.2;
    }
    
    animateSpecial() {
        const pulse = Math.sin(this.animationTime * 10) * 0.1 + 0.3;
        this.bodyParts.aura.material.opacity = pulse;
        this.bodyParts.aura.scale.setScalar(1 + pulse * 0.5);
        this.bodyParts.leftArmGroup.rotation.x = -1.2;
        this.bodyParts.rightArmGroup.rotation.x = -1.2;
    }
    
    animateBlock() {
        this.bodyParts.leftArmGroup.rotation.x = -1.3;
        this.bodyParts.rightArmGroup.rotation.x = -1.3;
        this.bodyParts.leftArmGroup.rotation.z = -0.3;
        this.bodyParts.rightArmGroup.rotation.z = 0.3;
        this.bodyParts.torso.position.y = 1.3;
    }
    
    animateDodge() {
        const progress = Math.sin(this.animationTime * 15);
        this.bodyParts.torso.rotation.z = progress * 0.5;
        this.mesh.position.x += progress * 0.1 * this.direction;
    }
    
    animateDomain() {
        // Эпичная поза для Domain Expansion
        const pulse = Math.sin(this.animationTime * 5) * 0.2 + 0.8;
        
        this.bodyParts.aura.material.opacity = pulse;
        this.bodyParts.aura.material.color.setHex(this.characterType === 'gojo' ? 0x00bfff : 0xff0000);
        this.bodyParts.aura.scale.setScalar(2 + pulse);
        
        // Руки подняты
        this.bodyParts.leftArmGroup.rotation.x = -2;
        this.bodyParts.rightArmGroup.rotation.x = -2;
        this.bodyParts.leftArmGroup.rotation.z = -0.5;
        this.bodyParts.rightArmGroup.rotation.z = 0.5;
        
        // Голова назад
        this.bodyParts.headGroup.rotation.x = -0.3;
    }
    
    animateHit() {
        const shake = Math.sin(this.animationTime * 30) * 0.05;
        this.mesh.position.x += shake;
        this.bodyParts.torso.rotation.x = -0.2;
    }
    
    setAnimation(name) {
        if (this.currentAnimation !== name) {
            this.currentAnimation = name;
            this.resetPose();
        }
    }
    
    resetPose() {
        this.bodyParts.torso.position.y = 1.5;
        this.bodyParts.torso.rotation.set(0, 0, 0);
        this.bodyParts.headGroup.position.y = 2.3;
        this.bodyParts.headGroup.rotation.set(0, 0, 0);
        this.bodyParts.leftArmGroup.rotation.set(0, 0, 0);
        this.bodyParts.rightArmGroup.rotation.set(0, 0, 0);
        this.bodyParts.leftLegGroup.rotation.set(0, 0, 0);
        this.bodyParts.rightLegGroup.rotation.set(0, 0, 0);
        this.bodyParts.aura.material.opacity = 0;
        this.bodyParts.aura.scale.setScalar(1);
    }
    
    move(direction) {
        if (this.isDomainActive) return;
        
        this.velocity.x = direction.x * this.moveSpeed;
        this.velocity.z = direction.z * this.moveSpeed;
        
        if (direction.x !== 0) {
            this.direction = direction.x > 0 ? 1 : -1;
            this.mesh.rotation.y = direction.x > 0 ? 0 : Math.PI;
        }
        
        if (direction.x !== 0 || direction.z !== 0) {
            this.setAnimation('walk');
        } else {
            this.setAnimation('idle');
        }
    }
    
    jump() {
        if (!this.isJumping && this.mesh.position.y <= 0 && !this.isDomainActive) {
            this.velocity.y = this.jumpForce;
            this.isJumping = true;
            this.setAnimation('jump');
        }
    }
    
    punch() {
        if (this.isAttacking || this.isDomainActive) return null;
        this.isAttacking = true;
        this.setAnimation('punch');
        setTimeout(() => {
            this.isAttacking = false;
            this.setAnimation('idle');
        }, 300);
        return { damage: 10, range: 1.5 };
    }
    
    kick() {
        if (this.isAttacking || this.isDomainActive) return null;
        this.isAttacking = true;
        this.setAnimation('kick');
        setTimeout(() => {
            this.isAttacking = false;
            this.setAnimation('idle');
        }, 400);
        return { damage: 15, range: 2 };
    }
    
    special() {
        if (this.isAttacking || this.energy < 30 || this.isDomainActive) return null;
        this.isAttacking = true;
        this.energy -= 30;
        this.setAnimation('special');
        setTimeout(() => {
            this.isAttacking = false;
            this.setAnimation('idle');
        }, 800);
        return { damage: 25, range: 3 };
    }
    
    dodge() {
        if (this.isDodging || this.isDomainActive) return;
        this.isDodging = true;
        this.setAnimation('dodge');
        setTimeout(() => {
            this.isDodging = false;
            this.setAnimation('idle');
        }, 400);
    }
    
    block(isBlocking) {
        if (this.isDomainActive) return;
        this.isBlocking = isBlocking;
        this.setAnimation(isBlocking ? 'block' : 'idle');
    }
    
    takeDamage(amount) {
        if (this.isBlocking) {
            amount *= 0.3;
        }
        if (this.isDodging) {
            amount = 0;
        }
        
        this.health = Math.max(0, this.health - amount);
        
        if (amount > 0 && !this.isBlocking) {
            this.setAnimation('hit');
            setTimeout(() => {
                if (!this.isAttacking) {
                    this.setAnimation('idle');
                }
            }, 200);
        }
        
        if (this.health <= 0) {
            this.isAlive = false;
        }
        
        return amount;
    }
    
    activateDomainExpansion() {
        this.isDomainActive = true;
        this.setAnimation('domain');
        
        // Создаём визуальный эффект домена
        const domainColor = this.characterType === 'gojo' ? 0x00bfff : 0xff0000;
        
        const domainGeo = new THREE.SphereGeometry(15, 64, 64);
        const domainMat = new THREE.MeshBasicMaterial({
            color: domainColor,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide,
            wireframe: true
        });
        
        this.domainMesh = new THREE.Mesh(domainGeo, domainMat);
        this.domainMesh.position.copy(this.mesh.position);
        this.domainMesh.position.y = 7;
        this.scene.add(this.domainMesh);
        
        // Внутренняя сфера
        const innerGeo = new THREE.SphereGeometry(14, 32, 32);
        const innerMat = new THREE.MeshBasicMaterial({
            color: domainColor,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        this.domainMesh.add(innerMesh);
    }
    
    deactivateDomainExpansion() {
        this.isDomainActive = false;
        this.setAnimation('idle');
        
        if (this.domainMesh) {
            this.scene.remove(this.domainMesh);
            this.domainMesh = null;
        }
    }
    
    getPosition() {
        return this.mesh.position.clone();
    }
    
    lookAt(position) {
        const direction = position.x - this.mesh.position.x;
        this.mesh.rotation.y = direction > 0 ? 0 : Math.PI;
        this.direction = direction > 0 ? 1 : -1;
    }
}

// ===== TUTORIAL CLASS =====
class Tutorial {
    constructor(game) {
        this.game = game;
        this.currentStep = 0;
        this.isActive = false;
        this.isWaitingForInput = false;
        this.domainClashActive = false;
        
        this.steps = [
            {
                message: "Добро пожаловать в обучение! Ты играешь за Годжо Сатору - сильнейшего мага.",
                action: null,
                duration: 3000
            },
            {
                message: "Используй WASD или джойстик для передвижения. Попробуй подойти к врагу.",
                action: 'move',
                condition: () => this.getDistanceToEnemy() < 3
            },
            {
                message: "Отлично! Теперь нажми J или кнопку 👊 чтобы ударить!",
                action: 'punch',
                condition: () => this.game.enemy.health < 100
            },
            {
                message: "Хорошо! Нажми K или 🦵 для удара ногой - он сильнее!",
                action: 'kick',
                condition: () => this.game.enemy.health < 85
            },
            {
                message: "Теперь попробуй уворот! Нажми Q или проведи влево на экране.",
                action: 'dodge',
                waitForInput: 'dodge'
            },
            {
                message: "Нажми L или ✨ для спецприёма! Он тратит энергию.",
                action: 'special',
                condition: () => this.game.enemy.health < 70
            },
            {
                message: "Используй Shift или 🛡️ для блока. Заблокируй атаку врага!",
                action: 'block',
                waitForInput: 'block'
            },
            {
                message: "Продолжай атаковать Сукуну!",
                action: 'damage',
                condition: () => this.game.enemy.health <= 50
            }
        ];
        
        this.domainStep = {
            message: "Сукуна ослаблен! Активируй Domain Expansion: Infinite Void!",
            buttonText: "DOMAIN EXPANSION: INFINITE VOID",
            action: 'domain'
        };
    }
    
    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.showStep();
    }
    
    getDistanceToEnemy() {
        return this.game.player.mesh.position.distanceTo(this.game.enemy.mesh.position);
    }
    
    showStep() {
        if (this.currentStep >= this.steps.length) {
            this.checkForDomainPhase();
            return;
        }
        
        const step = this.steps[this.currentStep];
        this.showMessage(step.message);
        
        if (step.duration) {
            setTimeout(() => {
                this.nextStep();
            }, step.duration);
        } else if (step.waitForInput) {
            this.isWaitingForInput = step.waitForInput;
        }
    }
    
    checkForDomainPhase() {
        if (this.game.enemy.health <= 50 && !this.domainClashActive) {
            this.showDomainPrompt();
        }
    }
    
    showDomainPrompt() {
        this.game.isPaused = true;
        this.showMessage(this.domainStep.message);
        this.showDomainButton();
    }
    
    showDomainButton() {
        const button = document.createElement('button');
        button.id = 'domainButton';
        button.className = 'domain-button';
        button.innerHTML = `
            <span class="domain-text">🔮 DOMAIN EXPANSION</span>
            <span class="domain-name">INFINITE VOID</span>
        `;
        
        button.addEventListener('click', () => {
            button.remove();
            this.startDomainClash();
        });
        
        document.getElementById('gameScreen').appendChild(button);
    }
    
    startDomainClash() {
        this.domainClashActive = true;
        this.game.isPaused = false;
        
        // Активируем домены обоих персонажей
        this.game.player.activateDomainExpansion();
        
        setTimeout(() => {
            this.game.enemy.activateDomainExpansion();
            this.showMessage("Сукуна активировал Domain Expansion: Malevolent Shrine!");
            
            setTimeout(() => {
                this.showMessage("DOMAIN CLASH! Нажимай как можно быстрее!");
                this.startDomainClashMinigame();
            }, 2000);
        }, 1500);
    }
    
    startDomainClashMinigame() {
        const clashUI = document.createElement('div');
        clashUI.id = 'domainClash';
        clashUI.className = 'domain-clash';
        clashUI.innerHTML = `
            <div class="clash-title">⚔️ DOMAIN CLASH ⚔️</div>
            <div class="clash-bars">
                <div class="clash-bar gojo-bar">
                    <div class="clash-fill gojo-fill" id="gojoClashFill"></div>
                </div>
                <div class="clash-vs">VS</div>
                <div class="clash-bar sukuna-bar">
                    <div class="clash-fill sukuna-fill" id="sukunaClashFill"></div>
                </div>
            </div>
            <div class="clash-score">
                <span id="gojoScore">0</span> : <span id="sukunaScore">0</span>
            </div>
            <div class="clash-timer" id="clashTimer">10</div>
            <button class="clash-button" id="clashButton">
                <span>👊 НАЖИМАЙ! 👊</span>
            </button>
            <div class="clash-hint">Нажимай кнопку или пробел как можно быстрее!</div>
        `;
        
        document.getElementById('gameScreen').appendChild(clashUI);
        
        let gojoScore = 0;
        let sukunaScore = 0;
        let timeLeft = 10;
        
        const gojoFill = document.getElementById('gojoClashFill');
        const sukunaFill = document.getElementById('sukunaClashFill');
        const gojoScoreEl = document.getElementById('gojoScore');
        const sukunaScoreEl = document.getElementById('sukunaScore');
        const timerEl = document.getElementById('clashTimer');
        const clashButton = document.getElementById('clashButton');
        
        // Сукуна автоматически нажимает
        const sukunaInterval = setInterval(() => {
            sukunaScore += Math.floor(Math.random() * 3) + 1;
            sukunaScoreEl.textContent = sukunaScore;
            this.updateClashBars(gojoScore, sukunaScore, gojoFill, sukunaFill);
        }, 200);
        
        // Игрок нажимает
        const handleClick = () => {
            gojoScore += 5;
            gojoScoreEl.textContent = gojoScore;
            this.updateClashBars(gojoScore, sukunaScore, gojoFill, sukunaFill);
            
            // Эффект нажатия
            clashButton.classList.add('pressed');
            setTimeout(() => clashButton.classList.remove('pressed'), 50);
        };
        
        clashButton.addEventListener('click', handleClick);
        clashButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleClick();
        });
        
        const handleKeydown = (e) => {
            if (e.code === 'Space' || e.code === 'KeyJ') {
                e.preventDefault();
                handleClick();
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // Таймер
        const timerInterval = setInterval(() => {
            timeLeft--;
            timerEl.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                clearInterval(sukunaInterval);
                clashButton.removeEventListener('click', handleClick);
                document.removeEventListener('keydown', handleKeydown);
                
                this.endDomainClash(gojoScore, sukunaScore, clashUI);
            }
        }, 1000);
    }
    
    updateClashBars(gojoScore, sukunaScore, gojoFill, sukunaFill) {
        const total = gojoScore + sukunaScore || 1;
        const gojoPercent = (gojoScore / total) * 100;
        const sukunaPercent = (sukunaScore / total) * 100;
        
        gojoFill.style.width = gojoPercent + '%';
        sukunaFill.style.width = sukunaPercent + '%';
    }
    
    endDomainClash(gojoScore, sukunaScore, clashUI) {
        const playerWon = gojoScore > sukunaScore;
        
        clashUI.innerHTML = `
            <div class="clash-result ${playerWon ? 'win' : 'lose'}">
                <div class="result-title">${playerWon ? '🎉 ПОБЕДА!' : '💀 ПОРАЖЕНИЕ'}</div>
                <div class="result-score">${gojoScore} : ${sukunaScore}</div>
                <div class="result-text">${playerWon ? 
                    'Infinite Void превзошёл Malevolent Shrine!' : 
                    'Malevolent Shrine оказался сильнее!'}</div>
            </div>
        `;
        
        // Деактивируем домены
        this.game.player.deactivateDomainExpansion();
        this.game.enemy.deactivateDomainExpansion();
        
        if (playerWon) {
            // Наносим урон врагу
            this.game.enemy.takeDamage(40);
        } else {
            // Игрок получает урон
            this.game.player.takeDamage(30);
        }
        
        setTimeout(() => {
            clashUI.remove();
            this.endTutorial(playerWon);
        }, 3000);
    }
    
    endTutorial(playerWon) {
        this.isActive = false;
        this.domainClashActive = false;
        
        const message = playerWon ? 
            "Отлично! Ты освоил основы боя и победил Сукуну в Domain Clash!" :
            "Хорошая попытка! Ты освоил основы, но Сукуна оказался сильнее в Domain Clash.";
        
        this.showMessage(message);
        
        setTimeout(() => {
            this.showMessage("Обучение завершено! Возвращаемся в меню...");
            
            setTimeout(() => {
                this.game.endGame();
            }, 2000);
        }, 3000);
    }
    
    showMessage(text) {
        let messageEl = document.getElementById('tutorialMessage');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'tutorialMessage';
            messageEl.className = 'tutorial-message';
            document.getElementById('gameScreen').appendChild(messageEl);
        }
        
        messageEl.textContent = text;
        messageEl.classList.add('show');
    }
    
    hideMessage() {
        const messageEl = document.getElementById('tutorialMessage');
        if (messageEl) {
            messageEl.classList.remove('show');
        }
    }
    
    nextStep() {
        this.currentStep++;
        this.showStep();
    }
    
    update() {
        if (!this.isActive || this.domainClashActive) return;
        
        const step = this.steps[this.currentStep];
        if (!step) {
            this.checkForDomainPhase();
            return;
        }
        
        if (step.condition && step.condition()) {
            this.nextStep();
        }
    }
    
    onAction(action) {
        if (this.isWaitingForInput === action) {
            this.isWaitingForInput = false;
            this.nextStep();
        }
    }
}

// ===== GAME CLASS =====
class Game {
    constructor(container, options = {}) {
        this.container = container;
        this.clock = new THREE.Clock();
        this.keys = {};
        this.isRunning = true;
        this.isPaused = false;
        this.isTutorial = options.tutorial || false;
        this.onGameEnd = options.onGameEnd || (() => {});
        
        this.tutorial = null;
        this.cameraController = null;
        
        this.init();
    }
    
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        this.setupLighting();
        this.createArena();
        
        // Player (Gojo)
        this.player = new Character(this.scene, {
            name: 'Годжо Сатору',
            characterType: 'gojo',
            color: 0x1a1a2e,
            secondaryColor: 0x000033,
            hairColor: 0xffffff,
            skinColor: 0xffdbac,
            position: { x: -4, y: 0, z: 0 }
        });
        
        // Enemy (Sukuna)
        this.enemy = new Character(this.scene, {
            name: 'Сукуна',
            characterType: 'sukuna',
            color: 0x4a0000,
            secondaryColor: 0x2a0000,
            hairColor: 0xff6b9d,
            skinColor: 0xd4a574,
            position: { x: 4, y: 0, z: 0 }
        });
        this.enemy.mesh.rotation.y = Math.PI;
        
        // Camera controller
        this.cameraController = new CameraController(
            this.camera,
            this.player.mesh.position,
            this.renderer.domElement
        );
        
        // Tutorial
        if (this.isTutorial) {
            this.tutorial = new Tutorial(this);
            this.tutorial.start();
        }
        
        this.setupControls();
        this.setupEnemyAI();
        
        window.addEventListener('resize', () => this.onResize());
        
        this.animate();
    }
    
    setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);
        
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 10, 5);
        directional.castShadow = true;
        directional.shadow.camera.left = -15;
        directional.shadow.camera.right = 15;
        directional.shadow.camera.top = 15;
        directional.shadow.camera.bottom = -15;
        directional.shadow.mapSize.width = 2048;
        directional.shadow.mapSize.height = 2048;
        this.scene.add(directional);
        
        const rim = new THREE.DirectionalLight(0x0066ff, 0.3);
        rim.position.set(-5, 5, -5);
        this.scene.add(rim);
        
        const rim2 = new THREE.DirectionalLight(0xff0000, 0.2);
        rim2.position.set(5, 5, -5);
        this.scene.add(rim2);
    }
    
    createArena() {
        // Floor
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x222233, 
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Grid
        const grid = new THREE.GridHelper(30, 30, 0x444466, 0x333355);
        this.scene.add(grid);
        
        // Arena borders with glow
        const borderMat = new THREE.MeshStandardMaterial({
            color: 0x6633ff,
            transparent: true,
            opacity: 0.4,
            emissive: 0x6633ff,
            emissiveIntensity: 0.5
        });
        
        const positions = [
            { x: 0, z: 15, rot: 0 },
            { x: 0, z: -15, rot: 0 },
            { x: 15, z: 0, rot: Math.PI / 2 },
            { x: -15, z: 0, rot: Math.PI / 2 }
        ];
        
        positions.forEach(pos => {
            const border = new THREE.Mesh(new THREE.PlaneGeometry(30, 5), borderMat);
            border.position.set(pos.x, 2.5, pos.z);
            border.rotation.y = pos.rot;
            this.scene.add(border);
        });
        
        // Pillars
        this.createPillars();
    }
    
    createPillars() {
        const pillarGeo = new THREE.CylinderGeometry(0.5, 0.7, 6, 8);
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x333344,
            roughness: 0.7
        });
        
        const pillarPositions = [
            { x: 12, z: 12 },
            { x: -12, z: 12 },
            { x: 12, z: -12 },
            { x: -12, z: -12 }
        ];
        
        pillarPositions.forEach(pos => {
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(pos.x, 3, pos.z);
            pillar.castShadow = true;
            this.scene.add(pillar);
            
            // Torch light
            const light = new THREE.PointLight(0xff6600, 0.8, 10);
            light.position.set(pos.x, 5.5, pos.z);
            this.scene.add(light);
            
            // Flame effect
            const flameGeo = new THREE.SphereGeometry(0.2, 16, 16);
            const flameMat = new THREE.MeshBasicMaterial({
                color: 0xff6600,
                transparent: true,
                opacity: 0.8
            });
            const flame = new THREE.Mesh(flameGeo, flameMat);
            flame.position.set(pos.x, 5.5, pos.z);
            this.scene.add(flame);
        });
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (this.isPaused) return;
            
            this.keys[e.code] = true;
            
            if (e.code === 'KeyJ') {
                this.player.punch();
                this.checkAttack('punch');
                if (this.tutorial) this.tutorial.onAction('punch');
            }
            if (e.code === 'KeyK') {
                this.player.kick();
                this.checkAttack('kick');
                if (this.tutorial) this.tutorial.onAction('kick');
            }
            if (e.code === 'KeyL') {
                this.player.special();
                this.checkAttack('special');
                if (this.tutorial) this.tutorial.onAction('special');
            }
            if (e.code === 'Space') {
                e.preventDefault();
                this.player.jump();
            }
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.player.block(true);
                if (this.tutorial) this.tutorial.onAction('block');
            }
            if (e.code === 'KeyQ') {
                this.player.dodge();
                if (this.tutorial) this.tutorial.onAction('dodge');
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.player.block(false);
            }
        });
        
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        const joystick = document.getElementById('joystick');
        const knob = document.getElementById('joystickKnob');
        
        if (!joystick) return;
        
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
            const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), centerX - 25);
            const angle = Math.atan2(deltaY, deltaX);
            
            const knobX = Math.cos(angle) * distance;
            const knobY = Math.sin(angle) * distance;
            
            knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
            
            this.joystickData = {
                x: knobX / (centerX - 25),
                y: knobY / (centerY - 25)
            };
        };
        
        const resetJoystick = () => {
            knob.style.transform = 'translate(-50%, -50%)';
            this.joystickData = null;
        };
        
        joystick.addEventListener('touchstart', handleJoystick);
        joystick.addEventListener('touchmove', handleJoystick);
        joystick.addEventListener('touchend', resetJoystick);
        
        // Action buttons
        const addTouchHandler = (id, action) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    action();
                });
            }
        };
        
        addTouchHandler('btnPunch', () => {
            this.player.punch();
            this.checkAttack('punch');
        });
        addTouchHandler('btnKick', () => {
            this.player.kick();
            this.checkAttack('kick');
        });
        addTouchHandler('btnSpecial', () => {
            this.player.special();
            this.checkAttack('special');
        });
        addTouchHandler('btnJump', () => this.player.jump());
        
        const blockBtn = document.getElementById('btnBlock');
        if (blockBtn) {
            blockBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.player.block(true);
                if (this.tutorial) this.tutorial.onAction('block');
            });
            blockBtn.addEventListener('touchend', () => this.player.block(false));
        }
        
        // Dodge button (add to HTML)
        addTouchHandler('btnDodge', () => {
            this.player.dodge();
            if (this.tutorial) this.tutorial.onAction('dodge');
        });
    }
    
    setupEnemyAI() {
        this.enemyAITimer = 0;
        this.enemyAIInterval = 1.5;
    }
    
    updateEnemyAI(delta) {
        if (this.isPaused || this.enemy.isDomainActive) return;
        
        this.enemyAITimer += delta;
        
        const distance = this.player.mesh.position.distanceTo(this.enemy.mesh.position);
        
        // Враг смотрит на игрока
        this.enemy.lookAt(this.player.mesh.position);
        
        // Движение к игроку
        if (distance > 2.5) {
            const direction = new THREE.Vector3()
                .subVectors(this.player.mesh.position, this.enemy.mesh.position)
                .normalize();
            
            this.enemy.velocity.x = direction.x * 2;
            this.enemy.velocity.z = direction.z * 2;
            this.enemy.setAnimation('walk');
        } else {
            this.enemy.velocity.x = 0;
            this.enemy.velocity.z = 0;
            
            // Атака
            if (this.enemyAITimer >= this.enemyAIInterval) {
                this.enemyAITimer = 0;
                
                const attackType = Math.random();
                if (attackType < 0.4) {
                    this.enemy.punch();
                    this.checkEnemyAttack(10, 1.5);
                } else if (attackType < 0.7) {
                    this.enemy.kick();
                    this.checkEnemyAttack(15, 2);
                } else {
                    this.enemy.special();
                    this.checkEnemyAttack(25, 3);
                }
            }
        }
    }
    
    checkAttack(type) {
        const distance = this.player.mesh.position.distanceTo(this.enemy.mesh.position);
        let damage = 0;
        let range = 0;
        
        switch (type) {
            case 'punch': damage = 10; range = 1.5; break;
            case 'kick': damage = 15; range = 2; break;
            case 'special': damage = 25; range = 3; break;
        }
        
        if (distance <= range) {
            this.enemy.takeDamage(damage);
            this.createHitEffect(this.enemy.mesh.position);
            this.updateHUD();
        }
    }
    
    checkEnemyAttack(damage, range) {
        const distance = this.player.mesh.position.distanceTo(this.enemy.mesh.position);
        
        if (distance <= range) {
            const actualDamage = this.player.takeDamage(damage);
            if (actualDamage > 0) {
                this.createHitEffect(this.player.mesh.position);
            }
            this.updateHUD();
        }
    }
    
    createHitEffect(position) {
        const particleCount = 15;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 0.5;
            positions[i + 1] = (Math.random() - 0.5) * 0.5;
            positions[i + 2] = (Math.random() - 0.5) * 0.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffff00,
            size: 0.15,
            transparent: true,
            opacity: 1
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.position.copy(position);
        particles.position.y += 1.5;
        this.scene.add(particles);
        
        // Анимация
        let opacity = 1;
        const animate = () => {
            opacity -= 0.05;
            material.opacity = opacity;
            particles.position.y += 0.02;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(particles);
            }
        };
        animate();
    }
    
    update(delta) {
        if (!this.isRunning || this.isPaused) return;
        
        // Keyboard movement
        const direction = { x: 0, z: 0 };
        if (this.keys['KeyW'] || this.keys['ArrowUp']) direction.z = -1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) direction.z = 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) direction.x = -1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) direction.x = 1;
        
        // Joystick movement
        if (this.joystickData) {
            direction.x = this.joystickData.x;
            direction.z = this.joystickData.y;
        }
        
        this.player.move(direction);
        this.player.update(delta);
        this.enemy.update(delta);
        
        // Enemy AI
        this.updateEnemyAI(delta);
        
        // Tutorial update
        if (this.tutorial) {
            this.tutorial.update();
        }
        
        // Update HUD
        this.updateHUD();
        
        // Camera
        const midPoint = new THREE.Vector3()
            .addVectors(this.player.mesh.position, this.enemy.mesh.position)
            .multiplyScalar(0.5);
        midPoint.y = 1.5;
        
        this.cameraController.setTarget(midPoint);
        this.cameraController.update();
        
        // Check win/lose
        if (!this.isTutorial) {
            if (!this.player.isAlive) {
                this.endGame(false);
            } else if (!this.enemy.isAlive) {
                this.endGame(true);
            }
        }
    }
    
    updateHUD() {
        const playerHealth = document.getElementById('hudPlayerHealth');
        const playerEnergy = document.getElementById('hudPlayerEnergy');
        const enemyHealth = document.getElementById('hudEnemyHealth');
        const enemyEnergy = document.getElementById('hudEnemyEnergy');
        
        if (playerHealth) playerHealth.style.width = this.player.health + '%';
        if (playerEnergy) playerEnergy.style.width = this.player.energy + '%';
        if (enemyHealth) enemyHealth.style.width = this.enemy.health + '%';
        if (enemyEnergy) enemyEnergy.style.width = this.enemy.energy + '%';
    }
    
    animate() {
        if (!this.isRunning) return;
        
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
    
    endGame(playerWon) {
        this.isRunning = false;
        
        // Cleanup tutorial UI
        const tutorialMessage = document.getElementById('tutorialMessage');
        if (tutorialMessage) tutorialMessage.remove();
        
        const domainButton = document.getElementById('domainButton');
        if (domainButton) domainButton.remove();
        
        const domainClash = document.getElementById('domainClash');
        if (domainClash) domainClash.remove();
        
        this.onGameEnd(playerWon);
    }
    
    destroy() {
        this.isRunning = false;
        this.renderer.dispose();
        this.container.innerHTML = '';
        
        // Cleanup all UI
        ['tutorialMessage', 'domainButton', 'domainClash'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }
}

// ===== AUTH CLASS =====
class Auth {
    constructor() {
        this.currentUser = null;
    }
    
    async loadUserData(firebaseUser) {
        try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
                this.currentUser = { uid: firebaseUser.uid, email: firebaseUser.email, ...userDoc.data() };
            } else {
                await this.createUserProfile(firebaseUser);
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    }
    
    async createUserProfile(firebaseUser) {
        const username = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Player';
        const userData = {
            username,
            email: firebaseUser.email || '',
            avatar: '👤',
            level: 1,
            xp: 0,
            battles: 0,
            wins: 0,
            losses: 0,
            unlockedCharacters: ['gojo', 'itadori', 'megumi'],
            tutorialCompleted: false,
            createdAt: serverTimestamp()
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        this.currentUser = { uid: firebaseUser.uid, ...userData };
    }
    
    async register(email, password, username) {
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: username });
            
            const userData = {
                username,
                email,
                avatar: '👤',
                level: 1,
                xp: 0,
                battles: 0,
                wins: 0,
                losses: 0,
                unlockedCharacters: ['gojo', 'itadori', 'megumi'],
                tutorialCompleted: false,
                createdAt: serverTimestamp()
            };
            
            await setDoc(doc(db, 'users', cred.user.uid), userData);
            await sendEmailVerification(cred.user);
            
            return { success: true, message: 'Регистрация успешна!' };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }
    
    async login(email, password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }
    
    async loginWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }
    
    async loginAsGuest() {
        try {
            const cred = await signInAnonymously(auth);
            const guestData = {
                username: 'Гость_' + Math.floor(Math.random() * 10000),
                email: '',
                avatar: '👤',
                level: 1,
                xp: 0,
                battles: 0,
                wins: 0,
                losses: 0,
                isGuest: true,
                unlockedCharacters: ['gojo', 'itadori', 'megumi'],
                tutorialCompleted: false,
                createdAt: serverTimestamp()
            };
            
            await setDoc(doc(db, 'users', cred.user.uid), guestData);
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Ошибка гостевого входа' };
        }
    }
    
    async logout() {
        await signOut(auth);
        this.currentUser = null;
    }
    
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true, message: 'Письмо отправлено!' };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }
    
    async updateUserProfile(updates) {
        if (!this.currentUser) return;
        await updateDoc(doc(db, 'users', this.currentUser.uid), updates);
        Object.assign(this.currentUser, updates);
    }
    
    async changePassword(currentPassword, newPassword) {
        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }
    
    getErrorMessage(code) {
        const errors = {
            'auth/email-already-in-use': 'Email уже используется',
            'auth/invalid-email': 'Неверный email',
            'auth/weak-password': 'Слабый пароль (мин. 6 символов)',
            'auth/user-not-found': 'Пользователь не найден',
            'auth/wrong-password': 'Неверный пароль',
            'auth/too-many-requests': 'Слишком много попыток',
            'auth/popup-closed-by-user': 'Окно закрыто'
        };
        return errors[code] || 'Произошла ошибка';
    }
    
    isAuthenticated() {
        return auth.currentUser !== null;
    }
}

// ===== MAIN APP =====
class JujutsuFight {
    constructor() {
        this.authService = new Auth();
        this.game = null;
        this.settings = this.loadSettings();
        this.selectedAvatar = '👤';
        
        this.init();
    }
    
    init() {
        this.setup3DBackground();
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.authService.loadUserData(user).then(() => {
                    this.startLoading();
                });
            } else {
                this.startLoading();
            }
        });
    }
    
    startLoading() {
        const progress = document.getElementById('loadingProgress');
        const text = document.getElementById('loadingText');
        
        const steps = [
            { p: 25, t: 'Подключение...' },
            { p: 50, t: 'Загрузка ресурсов...' },
            { p: 75, t: 'Инициализация...' },
            { p: 100, t: 'Готово!' }
        ];
        
        let i = 0;
        const interval = setInterval(() => {
            if (i < steps.length) {
                progress.style.width = steps[i].p + '%';
                text.textContent = steps[i].t;
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => this.onLoadingComplete(), 500);
            }
        }, 400);
    }
    
    onLoadingComplete() {
        if (this.authService.isAuthenticated() && this.authService.currentUser) {
            this.setupApp();
            this.navigateTo('mainMenu');
        } else {
            this.setupAuthScreens();
            this.navigateTo('loginScreen');
        }
    }
    
    setupApp() {
        this.setupNavigation();
        this.setupCharacters();
        this.setupSettings();
        this.setupProfile();
        this.applySettings();
        this.updateUserDisplay();
    }
    
    setup3DBackground() {
        const container = document.getElementById('background3D');
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x0a0a0f, 1);
        container.appendChild(renderer.domElement);
        
        // Particles
        const geometry = new THREE.BufferGeometry();
        const count = 1500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        
        for (let i = 0; i < count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 25;
            positions[i + 1] = (Math.random() - 0.5) * 25;
            positions[i + 2] = (Math.random() - 0.5) * 25;
            
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
        
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        
        const animate = () => {
            requestAnimationFrame(animate);
            particles.rotation.x += 0.0003;
            particles.rotation.y += 0.0005;
            renderer.render(scene, camera);
        };
        
        animate();
        
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    setupAuthScreens() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            
            const result = await this.authService.login(email, password);
            if (result.success) {
                setTimeout(() => {
                    this.setupApp();
                    this.navigateTo('mainMenu');
                }, 500);
            } else {
                errorEl.textContent = result.error;
                errorEl.classList.add('show');
                setTimeout(() => errorEl.classList.remove('show'), 3000);
            }
        });
        
        // Register form
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirm = document.getElementById('registerConfirm').value;
            const errorEl = document.getElementById('registerError');
            
            if (password !== confirm) {
                errorEl.textContent = 'Пароли не совпадают';
                errorEl.classList.add('show');
                setTimeout(() => errorEl.classList.remove('show'), 3000);
                return;
            }
            
            const result = await this.authService.register(email, password, username);
            if (result.success) {
                this.showNotification('🎉 ' + result.message);
                setTimeout(() => {
                    this.setupApp();
                    this.navigateTo('mainMenu');
                }, 1000);
            } else {
                errorEl.textContent = result.error;
                errorEl.classList.add('show');
                setTimeout(() => errorEl.classList.remove('show'), 3000);
            }
        });
        
        // Forgot password
        document.getElementById('forgotForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value;
            const result = await this.authService.resetPassword(email);
            
            if (result.success) {
                document.getElementById('forgotSuccess').textContent = result.message;
                document.getElementById('forgotSuccess').classList.add('show');
            } else {
                document.getElementById('forgotError').textContent = result.error;
                document.getElementById('forgotError').classList.add('show');
            }
        });
        
        // Navigation
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('registerScreen');
        });
        
        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('loginScreen');
        });
        
        document.getElementById('forgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('forgotScreen');
        });
        
        document.getElementById('backToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('loginScreen');
        });
        
        // Social login
        document.getElementById('guestLogin').addEventListener('click', async () => {
            const result = await this.authService.loginAsGuest();
            if (result.success) {
                this.showNotification('👤 Вы вошли как гость');
                setTimeout(() => {
                    this.setupApp();
                    this.navigateTo('mainMenu');
                }, 500);
            }
        });
        
        document.getElementById('googleLogin').addEventListener('click', async () => {
            const result = await this.authService.loginWithGoogle();
            if (result.success) {
                setTimeout(() => {
                    this.setupApp();
                    this.navigateTo('mainMenu');
                }, 500);
            } else {
                this.showNotification('❌ ' + result.error);
            }
        });
        
        // Password toggle
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                input.type = input.type === 'password' ? 'text' : 'password';
                btn.textContent = input.type === 'password' ? '👁️' : '🙈';
            });
        });
        
        // Password strength
        document.getElementById('registerPassword').addEventListener('input', (e) => {
            const password = e.target.value;
            const fill = document.getElementById('strengthFill');
            const text = document.getElementById('strengthText');
            
            fill.className = 'strength-fill';
            text.className = 'strength-text';
            
            if (password.length === 0) {
                text.textContent = 'Введите пароль';
                return;
            }
            
            let strength = 0;
            if (password.length >= 6) strength++;
            if (password.length >= 10) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            if (strength <= 2) {
                fill.classList.add('weak');
                text.classList.add('weak');
                text.textContent = 'Слабый пароль';
            } else if (strength <= 3) {
                fill.classList.add('medium');
                text.classList.add('medium');
                text.textContent = 'Средний пароль';
            } else {
                fill.classList.add('strong');
                text.classList.add('strong');
                text.textContent = 'Надёжный пароль';
            }
        });
    }
    
    setupNavigation() {
        // Play button - show tutorial choice
        document.getElementById('playBtn').addEventListener('click', () => {
            this.showPlayModal();
        });
        
        document.getElementById('charactersBtn').addEventListener('click', () => {
            this.navigateTo('charactersScreen');
        });
        
        document.getElementById('profileBtn').addEventListener('click', () => {
            this.updateProfileDisplay();
            this.navigateTo('profileScreen');
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.navigateTo('settingsScreen');
        });
        
        document.getElementById('aboutBtn').addEventListener('click', () => {
            this.navigateTo('aboutScreen');
        });
        
        document.getElementById('backFromCharacters').addEventListener('click', () => this.navigateTo('mainMenu'));
        document.getElementById('backFromProfile').addEventListener('click', () => this.navigateTo('mainMenu'));
        document.getElementById('backFromSettings').addEventListener('click', () => this.navigateTo('mainMenu'));
        document.getElementById('backFromAbout').addEventListener('click', () => this.navigateTo('mainMenu'));
        
        document.getElementById('backFromGame').addEventListener('click', () => {
            this.stopGame();
            this.navigateTo('mainMenu');
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            if (this.game) this.game.isPaused = !this.game.isPaused;
        });
        
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await this.authService.logout();
            this.showNotification('👋 До свидания!');
            this.setupAuthScreens();
            this.navigateTo('loginScreen');
        });
    }
    
    showPlayModal() {
        const modal = document.createElement('div');
        modal.id = 'playModal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content play-modal">
                <h3>🎮 НАЧАТЬ ИГРУ</h3>
                <p>Хотите пройти обучение?</p>
                <div class="play-options">
                    <button class="menu-btn tutorial-btn" id="startTutorial">
                        <span>📖 ОБУЧЕНИЕ</span>
                        <small>Изучите основы боя</small>
                    </button>
                    <button class="menu-btn skip-btn" id="skipTutorial">
                        <span>⚔️ СРАЗУ В БОЙ</span>
                        <small>Для опытных игроков</small>
                    </button>
                </div>
                <button class="modal-btn cancel" id="cancelPlay">Отмена</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('startTutorial').addEventListener('click', () => {
            modal.remove();
            this.startGame(true);
        });
        
        document.getElementById('skipTutorial').addEventListener('click', () => {
            modal.remove();
            this.startGame(false);
        });
        
        document.getElementById('cancelPlay').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    startGame(tutorial = false) {
        this.navigateTo('gameScreen');
        
        const container = document.getElementById('gameContainer');
        container.innerHTML = '';
        
        this.game = new Game(container, {
            tutorial: tutorial,
            onGameEnd: (playerWon) => {
                this.onGameEnd(playerWon);
            }
        });
        
        // Update HUD names
        document.getElementById('hudPlayerName').textContent = 'Годжо Сатору';
        document.getElementById('hudEnemyName').textContent = 'Сукуна';
    }
    
    onGameEnd(playerWon) {
        setTimeout(() => {
            this.stopGame();
            this.navigateTo('mainMenu');
            
            if (playerWon) {
                this.showNotification('🎉 Победа!');
                this.authService.updateUserProfile({
                    battles: (this.authService.currentUser.battles || 0) + 1,
                    wins: (this.authService.currentUser.wins || 0) + 1,
                    xp: (this.authService.currentUser.xp || 0) + 50
                });
            } else {
                this.showNotification('💀 Поражение...');
                this.authService.updateUserProfile({
                    battles: (this.authService.currentUser.battles || 0) + 1,
                    losses: (this.authService.currentUser.losses || 0) + 1,
                    xp: (this.authService.currentUser.xp || 0) + 10
                });
            }
        }, 1000);
    }
    
    stopGame() {
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
    }
    
    setupCharacters() {
        document.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('click', () => {
                if (card.classList.contains('locked')) {
                    this.showNotification('🔒 Персонаж заблокирован!');
                    return;
                }
                
                document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                const name = card.querySelector('.character-name').textContent;
                this.showNotification(`✓ Выбран: ${name}`);
            });
        });
    }
    
    setupProfile() {
        document.getElementById('editProfileBtn').addEventListener('click', () => {
            const user = this.authService.currentUser;
            document.getElementById('editUsername').value = user.username;
            
            document.querySelectorAll('.avatar-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.avatar === user.avatar) opt.classList.add('selected');
            });
            this.selectedAvatar = user.avatar;
            
            this.openModal('editProfileModal');
        });
        
        document.getElementById('cancelEditProfile').addEventListener('click', () => {
            this.closeModal('editProfileModal');
        });
        
        document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('editUsername').value;
            
            await this.authService.updateUserProfile({
                username,
                avatar: this.selectedAvatar
            });
            
            this.updateUserDisplay();
            this.updateProfileDisplay();
            this.closeModal('editProfileModal');
            this.showNotification('✓ Профиль обновлён');
        });
        
        document.querySelectorAll('.avatar-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.selectedAvatar = opt.dataset.avatar;
            });
        });
        
        document.getElementById('changePasswordBtn').addEventListener('click', () => {
            if (this.authService.currentUser?.isGuest) {
                this.showNotification('🚫 Гости не могут менять пароль');
                return;
            }
            this.openModal('changePasswordModal');
        });
        
        document.getElementById('cancelChangePassword').addEventListener('click', () => {
            this.closeModal('changePasswordModal');
        });
        
        document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const current = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmNewPassword').value;
            const errorEl = document.getElementById('changePasswordError');
            
            if (newPass !== confirm) {
                errorEl.textContent = 'Пароли не совпадают';
                errorEl.classList.add('show');
                return;
            }
            
            const result = await this.authService.changePassword(current, newPass);
            if (result.success) {
                this.closeModal('changePasswordModal');
                this.showNotification('🔑 Пароль изменён');
                document.getElementById('changePasswordForm').reset();
            } else {
                errorEl.textContent = result.error;
                errorEl.classList.add('show');
            }
        });
    }
    
    setupSettings() {
        const musicSlider = document.getElementById('musicVolume');
        const musicValue = document.getElementById('musicValue');
        musicSlider.addEventListener('input', (e) => {
            musicValue.textContent = e.target.value + '%';
            this.settings.musicVolume = parseInt(e.target.value);
        });
        
        const sfxSlider = document.getElementById('sfxVolume');
        const sfxValue = document.getElementById('sfxValue');
        sfxSlider.addEventListener('input', (e) => {
            sfxValue.textContent = e.target.value + '%';
            this.settings.sfxVolume = parseInt(e.target.value);
        });
        
        document.getElementById('vibrationToggle').addEventListener('change', (e) => {
            this.settings.vibration = e.target.checked;
        });
        
        document.getElementById('graphicsQuality').addEventListener('change', (e) => {
            this.settings.graphicsQuality = e.target.value;
        });
        
        document.getElementById('language').addEventListener('change', (e) => {
            this.settings.language = e.target.value;
        });
        
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.settings.difficulty = e.target.value;
        });
        
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
            this.showNotification('💾 Настройки сохранены!');
        });
        
        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
            this.showNotification('🔄 Настройки сброшены!');
        });
    }
    
    loadSettings() {
        const saved = localStorage.getItem('jujutsuSettings');
        return saved ? JSON.parse(saved) : {
            musicVolume: 70,
            sfxVolume: 80,
            vibration: true,
            graphicsQuality: 'medium',
            language: 'ru',
            difficulty: 'normal'
        };
    }
    
    saveSettings() {
        localStorage.setItem('jujutsuSettings', JSON.stringify(this.settings));
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
    
    updateUserDisplay() {
        const user = this.authService.currentUser;
        if (!user) return;
        
        document.getElementById('userAvatar').textContent = user.avatar;
        document.getElementById('userName').textContent = user.username;
        document.getElementById('userLevel').textContent = `Уровень ${user.level}`;
    }
    
    updateProfileDisplay() {
        const user = this.authService.currentUser;
        if (!user) return;
        
        document.getElementById('profileAvatar').textContent = user.avatar;
        document.getElementById('profileName').textContent = user.username;
        document.getElementById('profileEmail').textContent = user.isGuest ? 'Гостевой аккаунт' : user.email;
        document.getElementById('profileLevel').textContent = user.level;
        
        const xpNeeded = user.level * 100;
        const xpPercent = ((user.xp || 0) / xpNeeded) * 100;
        document.getElementById('xpFill').style.width = xpPercent + '%';
        document.getElementById('xpText').textContent = `${user.xp || 0} / ${xpNeeded} XP`;
        
        document.getElementById('statBattles').textContent = user.battles || 0;
        document.getElementById('statWins').textContent = user.wins || 0;
        document.getElementById('statLosses').textContent = user.losses || 0;
        const winrate = (user.battles || 0) > 0 ? Math.round(((user.wins || 0) / user.battles) * 100) : 0;
        document.getElementById('statWinrate').textContent = winrate + '%';
    }
    
    navigateTo(screenId) {
        const current = document.querySelector('.screen.active');
        if (current) {
            current.classList.remove('active');
            setTimeout(() => { current.style.display = 'none'; }, 300);
        }
        
        setTimeout(() => {
            const next = document.getElementById(screenId);
            next.style.display = 'flex';
            setTimeout(() => next.classList.add('active'), 50);
        }, 300);
    }
    
    openModal(id) {
        const modal = document.getElementById(id);
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 50);
    }
    
    closeModal(id) {
        const modal = document.getElementById(id);
        modal.classList.remove('active');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
    
    showNotification(text) {
        const notification = document.getElementById('notification');
        document.getElementById('notificationText').textContent = text;
        notification.classList.add('show');
        
        if (this.settings.vibration && navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        setTimeout(() => notification.classList.remove('show'), 2500);
    }
}

// ===== START =====
window.addEventListener('DOMContentLoaded', () => {
    window.app = new JujutsuFight();
});// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInWithPopup,
    signInAnonymously,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyD6ReDa8vH044Yun5CkkzGNISuMDp4rtW8",
    authDomain: "jujutsu-fight.firebaseapp.com",
    projectId: "jujutsu-fight",
    storageBucket: "jujutsu-fight.firebasestorage.app",
    messagingSenderId: "506548974802",
    appId: "1:506548974802:web:3ac719e1381d561973290b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== CAMERA CONTROLLER =====
class CameraController {
    constructor(camera, target, domElement) {
        this.camera = camera;
        this.target = target;
        this.domElement = domElement;
        
        this.distance = 8;
        this.minDistance = 4;
        this.maxDistance = 15;
        
        this.theta = 0; // Горизонтальный угол
        this.phi = Math.PI / 6; // Вертикальный угол
        this.minPhi = 0.1;
        this.maxPhi = Math.PI / 2.5;
        
        this.rotateSpeed = 0.005;
        this.zoomSpeed = 0.001;
        
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        
        this.targetPosition = new THREE.Vector3();
        
        this.setupEvents();
        this.update();
    }
    
    setupEvents() {
        // Mouse events
        this.domElement.addEventListener('mousedown', (e) => {
            if (e.button === 2 || e.button === 1) { // Right or middle click
                this.isDragging = true;
                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });
        
        this.domElement.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.previousMousePosition.x;
                const deltaY = e.clientY - this.previousMousePosition.y;
                
                this.theta -= deltaX * this.rotateSpeed;
                this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi + deltaY * this.rotateSpeed));
                
                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });
        
        this.domElement.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        this.domElement.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });
        
        // Wheel zoom
        this.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, 
                this.distance + e.deltaY * this.zoomSpeed * 10));
        });
        
        // Touch events
        let touchStartDistance = 0;
        let touchStartTheta = 0;
        let touchStartPhi = 0;
        
        this.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                touchStartDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                touchStartTheta = this.theta;
                touchStartPhi = this.phi;
            }
        });
        
        this.domElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 1 && this.isDragging) {
                const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
                const deltaY = e.touches[0].clientY - this.previousMousePosition.y;
                
                this.theta -= deltaX * this.rotateSpeed * 2;
                this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi + deltaY * this.rotateSpeed * 2));
                
                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                
                const scale = touchStartDistance / currentDistance;
                this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, 
                    this.distance * scale * 0.1 + this.distance * 0.9));
            }
        });
        
        this.domElement.addEventListener('touchend', () => {
            this.isDragging = false;
        });
        
        // Prevent context menu
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setTarget(position) {
        this.targetPosition.copy(position);
    }
    
    update() {
        const x = this.targetPosition.x + this.distance * Math.sin(this.phi) * Math.sin(this.theta);
        const y = this.targetPosition.y + this.distance * Math.cos(this.phi);
        const z = this.targetPosition.z + this.distance * Math.sin(this.phi) * Math.cos(this.theta);
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.targetPosition.x, this.targetPosition.y + 1.5, this.targetPosition.z);
    }
}

// ===== CHARACTER CLASS =====
class Character {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.name = options.name || 'Character';
        this.color = options.color || 0x0066ff;
        this.secondaryColor = options.secondaryColor || 0x003399;
        this.skinColor = options.skinColor || 0xffdbac;
        this.hairColor = options.hairColor || 0x222222;
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.characterType = options.characterType || 'default';
        
        this.health = 100;
        this.maxHealth = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        this.isAlive = true;
        this.isBlocking = false;
        this.isAttacking = false;
        this.isJumping = false;
        this.isDodging = false;
        this.direction = 1;
        this.isDomainActive = false;
        
        this.velocity = { x: 0, y: 0, z: 0 };
        this.gravity = -25;
        this.jumpForce = 10;
        this.moveSpeed = 5;
        
        this.bodyParts = {};
        this.mesh = new THREE.Group();
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        
        this.createModel();
        this.scene.add(this.mesh);
        
        this.animationTime = 0;
        this.currentAnimation = 'idle';
        
        // Domain expansion
        this.domainMesh = null;
    }
    
    createModel() {
        // Тело
        const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4);
        const torsoMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.7 });
        this.bodyParts.torso = new THREE.Mesh(torsoGeo, torsoMat);
        this.bodyParts.torso.position.y = 1.5;
        this.bodyParts.torso.castShadow = true;
        this.mesh.add(this.bodyParts.torso);
        
        // Голова
        const headGroup = new THREE.Group();
        headGroup.position.y = 2.3;
        
        const headGeo = new THREE.SphereGeometry(0.28, 32, 32);
        const headMat = new THREE.MeshStandardMaterial({ color: this.skinColor });
        this.bodyParts.head = new THREE.Mesh(headGeo, headMat);
        this.bodyParts.head.castShadow = true;
        headGroup.add(this.bodyParts.head);
        
        // Волосы
        const hairGeo = new THREE.SphereGeometry(0.30, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const hairMat = new THREE.MeshStandardMaterial({ color: this.hairColor });
        this.bodyParts.hair = new THREE.Mesh(hairGeo, hairMat);
        this.bodyParts.hair.position.y = 0.05;
        headGroup.add(this.bodyParts.hair);
        
        // Глаза - особые для Годжо и Сукуны
        const eyeGeo = new THREE.SphereGeometry(0.05, 16, 16);
        let eyeColor = 0xffffff;
        let pupilColor = 0x000000;
        
        if (this.characterType === 'gojo') {
            pupilColor = 0x00bfff; // Голубые глаза Годжо
        } else if (this.characterType === 'sukuna') {
            pupilColor = 0xff0000; // Красные глаза Сукуны
            // Дополнительные глаза для Сукуны
            this.createExtraEyes(headGroup);
        }
        
        const eyeMat = new THREE.MeshStandardMaterial({ color: eyeColor });
        const pupilGeo = new THREE.SphereGeometry(0.03, 16, 16);
        const pupilMat = new THREE.MeshStandardMaterial({ color: pupilColor, emissive: pupilColor, emissiveIntensity: 0.3 });
        
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.1, 0.05, 0.23);
        headGroup.add(leftEye);
        
        const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
        leftPupil.position.set(-0.1, 0.05, 0.27);
        headGroup.add(leftPupil);
        
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.1, 0.05, 0.23);
        headGroup.add(rightEye);
        
        const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rightPupil.position.set(0.1, 0.05, 0.27);
        headGroup.add(rightPupil);
        
        this.bodyParts.headGroup = headGroup;
        this.mesh.add(headGroup);
        
        // Руки
        this.bodyParts.leftArmGroup = this.createArm(-0.5);
        this.bodyParts.rightArmGroup = this.createArm(0.5);
        
        // Пояс
        const beltGeo = new THREE.BoxGeometry(0.85, 0.15, 0.45);
        const beltMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.bodyParts.belt = new THREE.Mesh(beltGeo, beltMat);
        this.bodyParts.belt.position.y = 0.95;
        this.mesh.add(this.bodyParts.belt);
        
        // Ноги
        this.bodyParts.leftLegGroup = this.createLeg(-0.2);
        this.bodyParts.rightLegGroup = this.createLeg(0.2);
        
        // Аура
        const auraGeo = new THREE.SphereGeometry(1.2, 32, 32);
        const auraMat = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0,
            side: THREE.BackSide
        });
        this.bodyParts.aura = new THREE.Mesh(auraGeo, auraMat);
        this.bodyParts.aura.position.y = 1.5;
        this.mesh.add(this.bodyParts.aura);
        
        // Татуировки для Сукуны
        if (this.characterType === 'sukuna') {
            this.createSukunaTattoos();
        }
    }
    
    createExtraEyes(headGroup) {
        // Дополнительная пара глаз для Сукуны на лбу
        const eyeGeo = new THREE.SphereGeometry(0.035, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pupilGeo = new THREE.SphereGeometry(0.02, 16, 16);
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
        
        const leftExtraEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftExtraEye.position.set(-0.08, 0.18, 0.2);
        headGroup.add(leftExtraEye);
        
        const leftExtraPupil = new THREE.Mesh(pupilGeo, pupilMat);
        leftExtraPupil.position.set(-0.08, 0.18, 0.23);
        headGroup.add(leftExtraPupil);
        
        const rightExtraEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightExtraEye.position.set(0.08, 0.18, 0.2);
        headGroup.add(rightExtraEye);
        
        const rightExtraPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rightExtraPupil.position.set(0.08, 0.18, 0.23);
        headGroup.add(rightExtraPupil);
    }
    
    createSukunaTattoos() {
        // Линии на лице
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        // Линии на щеках
        for (let i = 0; i < 2; i++) {
            const lineGeo = new THREE.BoxGeometry(0.02, 0.15, 0.01);
            const line = new THREE.Mesh(lineGeo, lineMaterial);
            line.position.set(i === 0 ? -0.15 : 0.15, 2.25, 0.25);
            this.mesh.add(line);
        }
    }
    
    createArm(xPos) {
        const group = new THREE.Group();
        group.position.set(xPos, 1.9, 0);
        
        const armMat = new THREE.MeshStandardMaterial({ color: this.color });
        const skinMat = new THREE.MeshStandardMaterial({ color: this.skinColor });
        
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 16), armMat);
        upperArm.position.y = -0.3;
        upperArm.castShadow = true;
        group.add(upperArm);
        
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), armMat);
        elbow.position.y = -0.55;
        group.add(elbow);
        
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.45, 16), skinMat);
        forearm.position.y = -0.8;
        forearm.castShadow = true;
        group.add(forearm);
        
        const fist = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), skinMat);
        fist.position.y = -1.05;
        fist.castShadow = true;
        group.add(fist);
        
        this.mesh.add(group);
        return group;
    }
    
    createLeg(xPos) {
        const group = new THREE.Group();
        group.position.set(xPos, 0.85, 0);
        
        const legMat = new THREE.MeshStandardMaterial({ color: this.secondaryColor });
        const footMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.5, 16), legMat);
        thigh.position.y = -0.3;
        thigh.castShadow = true;
        group.add(thigh);
        
        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), legMat);
        knee.position.y = -0.55;
        group.add(knee);
        
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 16), legMat);
        shin.position.y = -0.85;
        shin.castShadow = true;
        group.add(shin);
        
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.3), footMat);
        foot.position.set(0, -1.15, 0.05);
        foot.castShadow = true;
        group.add(foot);
        
        this.mesh.add(group);
        return group;
    }
    
    update(delta) {
        this.animationTime += delta;
        
        // Регенерация энергии
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.maxEnergy, this.energy + 5 * delta);
        }
        
        // Гравитация
        if (this.mesh.position.y > 0 || this.velocity.y > 0) {
            this.velocity.y += this.gravity * delta;
            this.mesh.position.y += this.velocity.y * delta;
            
            if (this.mesh.position.y <= 0) {
                this.mesh.position.y = 0;
                this.velocity.y = 0;
                this.isJumping = false;
            }
        }
        
        this.mesh.position.x += this.velocity.x * delta;
        this.mesh.position.z += this.velocity.z * delta;
        
        // Ограничение арены
        this.mesh.position.x = Math.max(-14, Math.min(14, this.mesh.position.x));
        this.mesh.position.z = Math.max(-14, Math.min(14, this.mesh.position.z));
        
        // Анимации
        switch (this.currentAnimation) {
            case 'idle': this.animateIdle(); break;
            case 'walk': this.animateWalk(); break;
            case 'run': this.animateRun(); break;
            case 'jump': this.animateJump(); break;
            case 'punch': this.animatePunch(); break;
            case 'kick': this.animateKick(); break;
            case 'special': this.animateSpecial(); break;
            case 'block': this.animateBlock(); break;
            case 'dodge': this.animateDodge(); break;
            case 'domain': this.animateDomain(); break;
            case 'hit': this.animateHit(); break;
        }
        
        // Domain expansion эффект
        if (this.domainMesh) {
            this.domainMesh.rotation.y += delta * 0.5;
        }
    }
    
    animateIdle() {
        const breathe = Math.sin(this.animationTime * 2) * 0.02;
        this.bodyParts.torso.position.y = 1.5 + breathe;
        this.bodyParts.headGroup.position.y = 2.3 + breathe;
        
        this.bodyParts.leftArmGroup.rotation.z = 0.3;
        this.bodyParts.rightArmGroup.rotation.z = -0.3;
        this.bodyParts.leftArmGroup.rotation.x = -0.5;
        this.bodyParts.rightArmGroup.rotation.x = -0.5;
    }
    
    animateWalk() {
        const swing = Math.sin(this.animationTime * 8) * 0.5;
        this.bodyParts.leftLegGroup.rotation.x = swing;
        this.bodyParts.rightLegGroup.rotation.x = -swing;
        this.bodyParts.leftArmGroup.rotation.x = -swing * 0.6 - 0.3;
        this.bodyParts.rightArmGroup.rotation.x = swing * 0.6 - 0.3;
    }
    
    animateRun() {
        const swing = Math.sin(this.animationTime * 12) * 0.7;
        this.bodyParts.leftLegGroup.rotation.x = swing;
        this.bodyParts.rightLegGroup.rotation.x = -swing;
        this.bodyParts.leftArmGroup.rotation.x = -swing * 0.8 - 0.5;
        this.bodyParts.rightArmGroup.rotation.x = swing * 0.8 - 0.5;
        this.bodyParts.torso.rotation.x = 0.1;
    }
    
    animateJump() {
        this.bodyParts.leftLegGroup.rotation.x = -0.5;
        this.bodyParts.rightLegGroup.rotation.x = -0.3;
        this.bodyParts.leftArmGroup.rotation.x = -1;
        this.bodyParts.rightArmGroup.rotation.x = -1;
    }
    
    animatePunch() {
        this.bodyParts.rightArmGroup.rotation.x = -1.5;
        this.bodyParts.rightArmGroup.rotation.z = 0;
        this.bodyParts.torso.rotation.y = -0.3 * this.direction;
    }
    
    animateKick() {
        this.bodyParts.rightLegGroup.rotation.x = 1.2;
        this.bodyParts.torso.rotation.x = -0.2;
    }
    
    animateSpecial() {
        const pulse = Math.sin(this.animationTime * 10) * 0.1 + 0.3;
        this.bodyParts.aura.material.opacity = pulse;
        this.bodyParts.aura.scale.setScalar(1 + pulse * 0.5);
        this.bodyParts.leftArmGroup.rotation.x = -1.2;
        this.bodyParts.rightArmGroup.rotation.x = -1.2;
    }
    
    animateBlock() {
        this.bodyParts.leftArmGroup.rotation.x = -1.3;
        this.bodyParts.rightArmGroup.rotation.x = -1.3;
        this.bodyParts.leftArmGroup.rotation.z = -0.3;
        this.bodyParts.rightArmGroup.rotation.z = 0.3;
        this.bodyParts.torso.position.y = 1.3;
    }
    
    animateDodge() {
        const progress = Math.sin(this.animationTime * 15);
        this.bodyParts.torso.rotation.z = progress * 0.5;
        this.mesh.position.x += progress * 0.1 * this.direction;
    }
    
    animateDomain() {
        // Эпичная поза для Domain Expansion
        const pulse = Math.sin(this.animationTime * 5) * 0.2 + 0.8;
        
        this.bodyParts.aura.material.opacity = pulse;
        this.bodyParts.aura.material.color.setHex(this.characterType === 'gojo' ? 0x00bfff : 0xff0000);
        this.bodyParts.aura.scale.setScalar(2 + pulse);
        
        // Руки подняты
        this.bodyParts.leftArmGroup.rotation.x = -2;
        this.bodyParts.rightArmGroup.rotation.x = -2;
        this.bodyParts.leftArmGroup.rotation.z = -0.5;
        this.bodyParts.rightArmGroup.rotation.z = 0.5;
        
        // Голова назад
        this.bodyParts.headGroup.rotation.x = -0.3;
    }
    
    animateHit() {
        const shake = Math.sin(this.animationTime * 30) * 0.05;
        this.mesh.position.x += shake;
        this.bodyParts.torso.rotation.x = -0.2;
    }
    
    setAnimation(name) {
        if (this.currentAnimation !== name) {
            this.currentAnimation = name;
            this.resetPose();
        }
    }
    
    resetPose() {
        this.bodyParts.torso.position.y = 1.5;
        this.bodyParts.torso.rotation.set(0, 0, 0);
        this.bodyParts.headGroup.position.y = 2.3;
        this.bodyParts.headGroup.rotation.set(0, 0, 0);
        this.bodyParts.leftArmGroup.rotation.set(0, 0, 0);
        this.bodyParts.rightArmGroup.rotation.set(0, 0, 0);
        this.bodyParts.leftLegGroup.rotation.set(0, 0, 0);
        this.bodyParts.rightLegGroup.rotation.set(0, 0, 0);
        this.bodyParts.aura.material.opacity = 0;
        this.bodyParts.aura.scale.setScalar(1);
    }
    
    move(direction) {
        if (this.isDomainActive) return;
        
        this.velocity.x = direction.x * this.moveSpeed;
        this.velocity.z = direction.z * this.moveSpeed;
        
        if (direction.x !== 0) {
            this.direction = direction.x > 0 ? 1 : -1;
            this.mesh.rotation.y = direction.x > 0 ? 0 : Math.PI;
        }
        
        if (direction.x !== 0 || direction.z !== 0) {
            this.setAnimation('walk');
        } else {
            this.setAnimation('idle');
        }
    }
    
    jump() {
        if (!this.isJumping && this.mesh.position.y <= 0 && !this.isDomainActive) {
            this.velocity.y = this.jumpForce;
            this.isJumping = true;
            this.setAnimation('jump');
        }
    }
    
    punch() {
        if (this.isAttacking || this.isDomainActive) return null;
        this.isAttacking = true;
        this.setAnimation('punch');
        setTimeout(() => {
            this.isAttacking = false;
            this.setAnimation('idle');
        }, 300);
        return { damage: 10, range: 1.5 };
    }
    
    kick() {
        if (this.isAttacking || this.isDomainActive) return null;
        this.isAttacking = true;
        this.setAnimation('kick');
        setTimeout(() => {
            this.isAttacking = false;
            this.setAnimation('idle');
        }, 400);
        return { damage: 15, range: 2 };
    }
    
    special() {
        if (this.isAttacking || this.energy < 30 || this.isDomainActive) return null;
        this.isAttacking = true;
        this.energy -= 30;
        this.setAnimation('special');
        setTimeout(() => {
            this.isAttacking = false;
            this.setAnimation('idle');
        }, 800);
        return { damage: 25, range: 3 };
    }
    
    dodge() {
        if (this.isDodging || this.isDomainActive) return;
        this.isDodging = true;
        this.setAnimation('dodge');
        setTimeout(() => {
            this.isDodging = false;
            this.setAnimation('idle');
        }, 400);
    }
    
    block(isBlocking) {
        if (this.isDomainActive) return;
        this.isBlocking = isBlocking;
        this.setAnimation(isBlocking ? 'block' : 'idle');
    }
    
    takeDamage(amount) {
        if (this.isBlocking) {
            amount *= 0.3;
        }
        if (this.isDodging) {
            amount = 0;
        }
        
        this.health = Math.max(0, this.health - amount);
        
        if (amount > 0 && !this.isBlocking) {
            this.setAnimation('hit');
            setTimeout(() => {
                if (!this.isAttacking) {
                    this.setAnimation('idle');
                }
            }, 200);
        }
        
        if (this.health <= 0) {
            this.isAlive = false;
        }
        
        return amount;
    }
    
    activateDomainExpansion() {
        this.isDomainActive = true;
        this.setAnimation('domain');
        
        // Создаём визуальный эффект домена
        const domainColor = this.characterType === 'gojo' ? 0x00bfff : 0xff0000;
        
        const domainGeo = new THREE.SphereGeometry(15, 64, 64);
        const domainMat = new THREE.MeshBasicMaterial({
            color: domainColor,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide,
            wireframe: true
        });
        
        this.domainMesh = new THREE.Mesh(domainGeo, domainMat);
        this.domainMesh.position.copy(this.mesh.position);
        this.domainMesh.position.y = 7;
        this.scene.add(this.domainMesh);
        
        // Внутренняя сфера
        const innerGeo = new THREE.SphereGeometry(14, 32, 32);
        const innerMat = new THREE.MeshBasicMaterial({
            color: domainColor,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        this.domainMesh.add(innerMesh);
    }
    
    deactivateDomainExpansion() {
        this.isDomainActive = false;
        this.setAnimation('idle');
        
        if (this.domainMesh) {
            this.scene.remove(this.domainMesh);
            this.domainMesh = null;
        }
    }
    
    getPosition() {
        return this.mesh.position.clone();
    }
    
    lookAt(position) {
        const direction = position.x - this.mesh.position.x;
        this.mesh.rotation.y = direction > 0 ? 0 : Math.PI;
        this.direction = direction > 0 ? 1 : -1;
    }
}

// ===== TUTORIAL CLASS =====
class Tutorial {
    constructor(game) {
        this.game = game;
        this.currentStep = 0;
        this.isActive = false;
        this.isWaitingForInput = false;
        this.domainClashActive = false;
        
        this.steps = [
            {
                message: "Добро пожаловать в обучение! Ты играешь за Годжо Сатору - сильнейшего мага.",
                action: null,
                duration: 3000
            },
            {
                message: "Используй WASD или джойстик для передвижения. Попробуй подойти к врагу.",
                action: 'move',
                condition: () => this.getDistanceToEnemy() < 3
            },
            {
                message: "Отлично! Теперь нажми J или кнопку 👊 чтобы ударить!",
                action: 'punch',
                condition: () => this.game.enemy.health < 100
            },
            {
                message: "Хорошо! Нажми K или 🦵 для удара ногой - он сильнее!",
                action: 'kick',
                condition: () => this.game.enemy.health < 85
            },
            {
                message: "Теперь попробуй уворот! Нажми Q или проведи влево на экране.",
                action: 'dodge',
                waitForInput: 'dodge'
            },
            {
                message: "Нажми L или ✨ для спецприёма! Он тратит энергию.",
                action: 'special',
                condition: () => this.game.enemy.health < 70
            },
            {
                message: "Используй Shift или 🛡️ для блока. Заблокируй атаку врага!",
                action: 'block',
                waitForInput: 'block'
            },
            {
                message: "Продолжай атаковать Сукуну!",
                action: 'damage',
                condition: () => this.game.enemy.health <= 50
            }
        ];
        
        this.domainStep = {
            message: "Сукуна ослаблен! Активируй Domain Expansion: Infinite Void!",
            buttonText: "DOMAIN EXPANSION: INFINITE VOID",
            action: 'domain'
        };
    }
    
    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.showStep();
    }
    
    getDistanceToEnemy() {
        return this.game.player.mesh.position.distanceTo(this.game.enemy.mesh.position);
    }
    
    showStep() {
        if (this.currentStep >= this.steps.length) {
            this.checkForDomainPhase();
            return;
        }
        
        const step = this.steps[this.currentStep];
        this.showMessage(step.message);
        
        if (step.duration) {
            setTimeout(() => {
                this.nextStep();
            }, step.duration);
        } else if (step.waitForInput) {
            this.isWaitingForInput = step.waitForInput;
        }
    }
    
    checkForDomainPhase() {
        if (this.game.enemy.health <= 50 && !this.domainClashActive) {
            this.showDomainPrompt();
        }
    }
    
    showDomainPrompt() {
        this.game.isPaused = true;
        this.showMessage(this.domainStep.message);
        this.showDomainButton();
    }
    
    showDomainButton() {
        const button = document.createElement('button');
        button.id = 'domainButton';
        button.className = 'domain-button';
        button.innerHTML = `
            <span class="domain-text">🔮 DOMAIN EXPANSION</span>
            <span class="domain-name">INFINITE VOID</span>
        `;
        
        button.addEventListener('click', () => {
            button.remove();
            this.startDomainClash();
        });
        
        document.getElementById('gameScreen').appendChild(button);
    }
    
    startDomainClash() {
        this.domainClashActive = true;
        this.game.isPaused = false;
        
        // Активируем домены обоих персонажей
        this.game.player.activateDomainExpansion();
        
        setTimeout(() => {
            this.game.enemy.activateDomainExpansion();
            this.showMessage("Сукуна активировал Domain Expansion: Malevolent Shrine!");
            
            setTimeout(() => {
                this.showMessage("DOMAIN CLASH! Нажимай как можно быстрее!");
                this.startDomainClashMinigame();
            }, 2000);
        }, 1500);
    }
    
    startDomainClashMinigame() {
        const clashUI = document.createElement('div');
        clashUI.id = 'domainClash';
        clashUI.className = 'domain-clash';
        clashUI.innerHTML = `
            <div class="clash-title">⚔️ DOMAIN CLASH ⚔️</div>
            <div class="clash-bars">
                <div class="clash-bar gojo-bar">
                    <div class="clash-fill gojo-fill" id="gojoClashFill"></div>
                </div>
                <div class="clash-vs">VS</div>
                <div class="clash-bar sukuna-bar">
                    <div class="clash-fill sukuna-fill" id="sukunaClashFill"></div>
                </div>
            </div>
            <div class="clash-score">
                <span id="gojoScore">0</span> : <span id="sukunaScore">0</span>
            </div>
            <div class="clash-timer" id="clashTimer">10</div>
            <button class="clash-button" id="clashButton">
                <span>👊 НАЖИМАЙ! 👊</span>
            </button>
            <div class="clash-hint">Нажимай кнопку или пробел как можно быстрее!</div>
        `;
        
        document.getElementById('gameScreen').appendChild(clashUI);
        
        let gojoScore = 0;
        let sukunaScore = 0;
        let timeLeft = 10;
        
        const gojoFill = document.getElementById('gojoClashFill');
        const sukunaFill = document.getElementById('sukunaClashFill');
        const gojoScoreEl = document.getElementById('gojoScore');
        const sukunaScoreEl = document.getElementById('sukunaScore');
        const timerEl = document.getElementById('clashTimer');
        const clashButton = document.getElementById('clashButton');
        
        // Сукуна автоматически нажимает
        const sukunaInterval = setInterval(() => {
            sukunaScore += Math.floor(Math.random() * 3) + 1;
            sukunaScoreEl.textContent = sukunaScore;
            this.updateClashBars(gojoScore, sukunaScore, gojoFill, sukunaFill);
        }, 200);
        
        // Игрок нажимает
        const handleClick = () => {
            gojoScore += 5;
            gojoScoreEl.textContent = gojoScore;
            this.updateClashBars(gojoScore, sukunaScore, gojoFill, sukunaFill);
            
            // Эффект нажатия
            clashButton.classList.add('pressed');
            setTimeout(() => clashButton.classList.remove('pressed'), 50);
        };
        
        clashButton.addEventListener('click', handleClick);
        clashButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleClick();
        });
        
        const handleKeydown = (e) => {
            if (e.code === 'Space' || e.code === 'KeyJ') {
                e.preventDefault();
                handleClick();
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // Таймер
        const timerInterval = setInterval(() => {
            timeLeft--;
            timerEl.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                clearInterval(sukunaInterval);
                clashButton.removeEventListener('click', handleClick);
                document.removeEventListener('keydown', handleKeydown);
                
                this.endDomainClash(gojoScore, sukunaScore, clashUI);
            }
        }, 1000);
    }
    
    updateClashBars(gojoScore, sukunaScore, gojoFill, sukunaFill) {
        const total = gojoScore + sukunaScore || 1;
        const gojoPercent = (gojoScore / total) * 100;
        const sukunaPercent = (sukunaScore / total) * 100;
        
        gojoFill.style.width = gojoPercent + '%';
        sukunaFill.style.width = sukunaPercent + '%';
    }
    
    endDomainClash(gojoScore, sukunaScore, clashUI) {
        const playerWon = gojoScore > sukunaScore;
        
        clashUI.innerHTML = `
            <div class="clash-result ${playerWon ? 'win' : 'lose'}">
                <div class="result-title">${playerWon ? '🎉 ПОБЕДА!' : '💀 ПОРАЖЕНИЕ'}</div>
                <div class="result-score">${gojoScore} : ${sukunaScore}</div>
                <div class="result-text">${playerWon ? 
                    'Infinite Void превзошёл Malevolent Shrine!' : 
                    'Malevolent Shrine оказался сильнее!'}</div>
            </div>
        `;
        
        // Деактивируем домены
        this.game.player.deactivateDomainExpansion();
        this.game.enemy.deactivateDomainExpansion();
        
        if (playerWon) {
            // Наносим урон врагу
            this.game.enemy.takeDamage(40);
        } else {
            // Игрок получает урон
            this.game.player.takeDamage(30);
        }
        
        setTimeout(() => {
            clashUI.remove();
            this.endTutorial(playerWon);
        }, 3000);
    }
    
    endTutorial(playerWon) {
        this.isActive = false;
        this.domainClashActive = false;
        
        const message = playerWon ? 
            "Отлично! Ты освоил основы боя и победил Сукуну в Domain Clash!" :
            "Хорошая попытка! Ты освоил основы, но Сукуна оказался сильнее в Domain Clash.";
        
        this.showMessage(message);
        
        setTimeout(() => {
            this.showMessage("Обучение завершено! Возвращаемся в меню...");
            
            setTimeout(() => {
                this.game.endGame();
            }, 2000);
        }, 3000);
    }
    
    showMessage(text) {
        let messageEl = document.getElementById('tutorialMessage');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'tutorialMessage';
            messageEl.className = 'tutorial-message';
            document.getElementById('gameScreen').appendChild(messageEl);
        }
        
        messageEl.textContent = text;
        messageEl.classList.add('show');
    }
    
    hideMessage() {
        const messageEl = document.getElementById('tutorialMessage');
        if (messageEl) {
            messageEl.classList.remove('show');
        }
    }
    
    nextStep() {
        this.currentStep++;
        this.showStep();
    }
    
    update() {
        if (!this.isActive || this.domainClashActive) return;
        
        const step = this.steps[this.currentStep];
        if (!step) {
            this.checkForDomainPhase();
            return;
        }
        
        if (step.condition && step.condition()) {
            this.nextStep();
        }
    }
    
    onAction(action) {
        if (this.isWaitingForInput === action) {
            this.isWaitingForInput = false;
            this.nextStep();
        }
    }
}

// ===== GAME CLASS =====
class Game {
    constructor(container, options = {}) {
        this.container = container;
        this.clock = new THREE.Clock();
        this.keys = {};
        this.isRunning = true;
        this.isPaused = false;
        this.isTutorial = options.tutorial || false;
        this.onGameEnd = options.onGameEnd || (() => {});
        
        this.tutorial = null;
        this.cameraController = null;
        
        this.init();
    }
    
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        this.setupLighting();
        this.createArena();
        
        // Player (Gojo)
        this.player = new Character(this.scene, {
            name: 'Годжо Сатору',
            characterType: 'gojo',
            color: 0x1a1a2e,
            secondaryColor: 0x000033,
            hairColor: 0xffffff,
            skinColor: 0xffdbac,
            position: { x: -4, y: 0, z: 0 }
        });
        
        // Enemy (Sukuna)
        this.enemy = new Character(this.scene, {
            name: 'Сукуна',
            characterType: 'sukuna',
            color: 0x4a0000,
            secondaryColor: 0x2a0000,
            hairColor: 0xff6b9d,
            skinColor: 0xd4a574,
            position: { x: 4, y: 0, z: 0 }
        });
        this.enemy.mesh.rotation.y = Math.PI;
        
        // Camera controller
        this.cameraController = new CameraController(
            this.camera,
            this.player.mesh.position,
            this.renderer.domElement
        );
        
        // Tutorial
        if (this.isTutorial) {
            this.tutorial = new Tutorial(this);
            this.tutorial.start();
        }
        
        this.setupControls();
        this.setupEnemyAI();
        
        window.addEventListener('resize', () => this.onResize());
        
        this.animate();
    }
    
    setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);
        
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 10, 5);
        directional.castShadow = true;
        directional.shadow.camera.left = -15;
        directional.shadow.camera.right = 15;
        directional.shadow.camera.top = 15;
        directional.shadow.camera.bottom = -15;
        directional.shadow.mapSize.width = 2048;
        directional.shadow.mapSize.height = 2048;
        this.scene.add(directional);
        
        const rim = new THREE.DirectionalLight(0x0066ff, 0.3);
        rim.position.set(-5, 5, -5);
        this.scene.add(rim);
        
        const rim2 = new THREE.DirectionalLight(0xff0000, 0.2);
        rim2.position.set(5, 5, -5);
        this.scene.add(rim2);
    }
    
    createArena() {
        // Floor
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x222233, 
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Grid
        const grid = new THREE.GridHelper(30, 30, 0x444466, 0x333355);
        this.scene.add(grid);
        
        // Arena borders with glow
        const borderMat = new THREE.MeshStandardMaterial({
            color: 0x6633ff,
            transparent: true,
            opacity: 0.4,
            emissive: 0x6633ff,
            emissiveIntensity: 0.5
        });
        
        const positions = [
            { x: 0, z: 15, rot: 0 },
            { x: 0, z: -15, rot: 0 },
            { x: 15, z: 0, rot: Math.PI / 2 },
            { x: -15, z: 0, rot: Math.PI / 2 }
        ];
        
        positions.forEach(pos => {
            const border = new THREE.Mesh(new THREE.PlaneGeometry(30, 5), borderMat);
            border.position.set(pos.x, 2.5, pos.z);
            border.rotation.y = pos.rot;
            this.scene.add(border);
        });
        
        // Pillars
        this.createPillars();
    }
    
    createPillars() {
        const pillarGeo = new THREE.CylinderGeometry(0.5, 0.7, 6, 8);
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x333344,
            roughness: 0.7
        });
        
        const pillarPositions = [
            { x: 12, z: 12 },
            { x: -12, z: 12 },
            { x: 12, z: -12 },
            { x: -12, z: -12 }
        ];
        
        pillarPositions.forEach(pos => {
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(pos.x, 3, pos.z);
            pillar.castShadow = true;
            this.scene.add(pillar);
            
            // Torch light
            const light = new THREE.PointLight(0xff6600, 0.8, 10);
            light.position.set(pos.x, 5.5, pos.z);
            this.scene.add(light);
            
            // Flame effect
            const flameGeo = new THREE.SphereGeometry(0.2, 16, 16);
            const flameMat = new THREE.MeshBasicMaterial({
                color: 0xff6600,
                transparent: true,
                opacity: 0.8
            });
            const flame = new THREE.Mesh(flameGeo, flameMat);
            flame.position.set(pos.x, 5.5, pos.z);
            this.scene.add(flame);
        });
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (this.isPaused) return;
            
            this.keys[e.code] = true;
            
            if (e.code === 'KeyJ') {
                this.player.punch();
                this.checkAttack('punch');
                if (this.tutorial) this.tutorial.onAction('punch');
            }
            if (e.code === 'KeyK') {
                this.player.kick();
                this.checkAttack('kick');
                if (this.tutorial) this.tutorial.onAction('kick');
            }
            if (e.code === 'KeyL') {
                this.player.special();
                this.checkAttack('special');
                if (this.tutorial) this.tutorial.onAction('special');
            }
            if (e.code === 'Space') {
                e.preventDefault();
                this.player.jump();
            }
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.player.block(true);
                if (this.tutorial) this.tutorial.onAction('block');
            }
            if (e.code === 'KeyQ') {
                this.player.dodge();
                if (this.tutorial) this.tutorial.onAction('dodge');
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.player.block(false);
            }
        });
        
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        const joystick = document.getElementById('joystick');
        const knob = document.getElementById('joystickKnob');
        
        if (!joystick) return;
        
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
            const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), centerX - 25);
            const angle = Math.atan2(deltaY, deltaX);
            
            const knobX = Math.cos(angle) * distance;
            const knobY = Math.sin(angle) * distance;
            
            knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
            
            this.joystickData = {
                x: knobX / (centerX - 25),
                y: knobY / (centerY - 25)
            };
        };
        
        const resetJoystick = () => {
            knob.style.transform = 'translate(-50%, -50%)';
            this.joystickData = null;
        };
        
        joystick.addEventListener('touchstart', handleJoystick);
        joystick.addEventListener('touchmove', handleJoystick);
        joystick.addEventListener('touchend', resetJoystick);
        
        // Action buttons
        const addTouchHandler = (id, action) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    action();
                });
            }
        };
        
        addTouchHandler('btnPunch', () => {
            this.player.punch();
            this.checkAttack('punch');
        });
        addTouchHandler('btnKick', () => {
            this.player.kick();
            this.checkAttack('kick');
        });
        addTouchHandler('btnSpecial', () => {
            this.player.special();
            this.checkAttack('special');
        });
        addTouchHandler('btnJump', () => this.player.jump());
        
        const blockBtn = document.getElementById('btnBlock');
        if (blockBtn) {
            blockBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.player.block(true);
                if (this.tutorial) this.tutorial.onAction('block');
            });
            blockBtn.addEventListener('touchend', () => this.player.block(false));
        }
        
        // Dodge button (add to HTML)
        addTouchHandler('btnDodge', () => {
            this.player.dodge();
            if (this.tutorial) this.tutorial.onAction('dodge');
        });
    }
    
    setupEnemyAI() {
        this.enemyAITimer = 0;
        this.enemyAIInterval = 1.5;
    }
    
    updateEnemyAI(delta) {
        if (this.isPaused || this.enemy.isDomainActive) return;
        
        this.enemyAITimer += delta;
        
        const distance = this.player.mesh.position.distanceTo(this.enemy.mesh.position);
        
        // Враг смотрит на игрока
        this.enemy.lookAt(this.player.mesh.position);
        
        // Движение к игроку
        if (distance > 2.5) {
            const direction = new THREE.Vector3()
                .subVectors(this.player.mesh.position, this.enemy.mesh.position)
                .normalize();
            
            this.enemy.velocity.x = direction.x * 2;
            this.enemy.velocity.z = direction.z * 2;
            this.enemy.setAnimation('walk');
        } else {
            this.enemy.velocity.x = 0;
            this.enemy.velocity.z = 0;
            
            // Атака
            if (this.enemyAITimer >= this.enemyAIInterval) {
                this.enemyAITimer = 0;
                
                const attackType = Math.random();
                if (attackType < 0.4) {
                    this.enemy.punch();
                    this.checkEnemyAttack(10, 1.5);
                } else if (attackType < 0.7) {
                    this.enemy.kick();
                    this.checkEnemyAttack(15, 2);
                } else {
                    this.enemy.special();
                    this.checkEnemyAttack(25, 3);
                }
            }
        }
    }
    
    checkAttack(type) {
        const distance = this.player.mesh.position.distanceTo(this.enemy.mesh.position);
        let damage = 0;
        let range = 0;
        
        switch (type) {
            case 'punch': damage = 10; range = 1.5; break;
            case 'kick': damage = 15; range = 2; break;
            case 'special': damage = 25; range = 3; break;
        }
        
        if (distance <= range) {
            this.enemy.takeDamage(damage);
            this.createHitEffect(this.enemy.mesh.position);
            this.updateHUD();
        }
    }
    
    checkEnemyAttack(damage, range) {
        const distance = this.player.mesh.position.distanceTo(this.enemy.mesh.position);
        
        if (distance <= range) {
            const actualDamage = this.player.takeDamage(damage);
            if (actualDamage > 0) {
                this.createHitEffect(this.player.mesh.position);
            }
            this.updateHUD();
        }
    }
    
    createHitEffect(position) {
        const particleCount = 15;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 0.5;
            positions[i + 1] = (Math.random() - 0.5) * 0.5;
            positions[i + 2] = (Math.random() - 0.5) * 0.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffff00,
            size: 0.15,
            transparent: true,
            opacity: 1
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.position.copy(position);
        particles.position.y += 1.5;
        this.scene.add(particles);
        
        // Анимация
        let opacity = 1;
        const animate = () => {
            opacity -= 0.05;
            material.opacity = opacity;
            particles.position.y += 0.02;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(particles);
            }
        };
        animate();
    }
    
    update(delta) {
        if (!this.isRunning || this.isPaused) return;
        
        // Keyboard movement
        const direction = { x: 0, z: 0 };
        if (this.keys['KeyW'] || this.keys['ArrowUp']) direction.z = -1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) direction.z = 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) direction.x = -1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) direction.x = 1;
        
        // Joystick movement
        if (this.joystickData) {
            direction.x = this.joystickData.x;
            direction.z = this.joystickData.y;
        }
        
        this.player.move(direction);
        this.player.update(delta);
        this.enemy.update(delta);
        
        // Enemy AI
        this.updateEnemyAI(delta);
        
        // Tutorial update
        if (this.tutorial) {
            this.tutorial.update();
        }
        
        // Update HUD
        this.updateHUD();
        
        // Camera
        const midPoint = new THREE.Vector3()
            .addVectors(this.player.mesh.position, this.enemy.mesh.position)
            .multiplyScalar(0.5);
        midPoint.y = 1.5;
        
        this.cameraController.setTarget(midPoint);
        this.cameraController.update();
        
        // Check win/lose
        if (!this.isTutorial) {
            if (!this.player.isAlive) {
                this.endGame(false);
            } else if (!this.enemy.isAlive) {
                this.endGame(true);
            }
        }
    }
    
    updateHUD() {
        const playerHealth = document.getElementById('hudPlayerHealth');
        const playerEnergy = document.getElementById('hudPlayerEnergy');
        const enemyHealth = document.getElementById('hudEnemyHealth');
        const enemyEnergy = document.getElementById('hudEnemyEnergy');
        
        if (playerHealth) playerHealth.style.width = this.player.health + '%';
        if (playerEnergy) playerEnergy.style.width = this.player.energy + '%';
        if (enemyHealth) enemyHealth.style.width = this.enemy.health + '%';
        if (enemyEnergy) enemyEnergy.style.width = this.enemy.energy + '%';
    }
    
    animate() {
        if (!this.isRunning) return;
        
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
    
    endGame(playerWon) {
        this.isRunning = false;
        
        // Cleanup tutorial UI
        const tutorialMessage = document.getElementById('tutorialMessage');
        if (tutorialMessage) tutorialMessage.remove();
        
        const domainButton = document.getElementById('domainButton');
        if (domainButton) domainButton.remove();
        
        const domainClash = document.getElementById('domainClash');
        if (domainClash) domainClash.remove();
        
        this.onGameEnd(playerWon);
    }
    
    destroy() {
        this.isRunning = false;
        this.renderer.dispose();
        this.container.innerHTML = '';
        
        // Cleanup all UI
        ['tutorialMessage', 'domainButton', 'domainClash'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }
}

// ===== AUTH CLASS =====
class Auth {
    constructor() {
        this.currentUser = null;
    }
    
    async loadUserData(firebaseUser) {
        try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
                this.currentUser = { uid: firebaseUser.uid, email: firebaseUser.email, ...userDoc.data() };
            } else {
                await this.createUserProfile(firebaseUser);
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    }
    
    async createUserProfile(firebaseUser) {
        const username = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Player';
        const userData = {
            username,
            email: firebaseUser.email || '',
            avatar: '👤',
            level: 1,
            xp: 0,
            battles: 0,
            wins: 0,
            losses: 0,
            unlockedCharacters: ['gojo', 'itadori', 'megumi'],
            tutorialCompleted: false,
            createdAt: serverTimestamp()
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        this.currentUser = { uid: firebaseUser.uid, ...userData };
    }
    
    async register(email, password, username) {
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: username });
            
            const userData = {
                username,
                email,
                avatar: '👤',
                level: 1,
                xp: 0,
                battles: 0,
                wins: 0,
                losses: 0,
                unlockedCharacters: ['gojo', 'itadori', 'megumi'],
                tutorialCompleted: false,
                createdAt: serverTimestamp()
            };
            
            await setDoc(doc(db, 'users', cred.user.uid), userData);
            await sendEmailVerification(cred.user);
            
            return { success: true, message: 'Регистрация успешна!' };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }
    
    async login(email, password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }
    
    async loginWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }
    
    async loginAsGuest() {
        try {
            const cred = await signInAnonymously(auth);
            const guestData = {
                username: 'Гость_' + Math.floor(Math.random() * 10000),
                email: '',
                avatar: '👤',
                level: 1,
                xp: 0,
                battles: 0,
                wins: 0,
                losses: 0,
                isGuest: true,
                unlockedCharacters: ['gojo', 'itadori', 'megumi'],
                tutorialCompleted: false,
                createdAt: serverTimestamp()
            };
            
            await setDoc(doc(db, 'users', cred.user.uid), guestData);
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Ошибка гостевого входа' };
        }
    }
    
    async logout() {
        await signOut(auth);
        this.currentUser = null;
    }
    
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true, message: 'Письмо отправлено!' };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }
    
    async updateUserProfile(updates) {
        if (!this.currentUser) return;
        await updateDoc(doc(db, 'users', this.currentUser.uid), updates);
        Object.assign(this.currentUser, updates);
    }
    
    async changePassword(currentPassword, newPassword) {
        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }
    
    getErrorMessage(code) {
        const errors = {
            'auth/email-already-in-use': 'Email уже используется',
            'auth/invalid-email': 'Неверный email',
            'auth/weak-password': 'Слабый пароль (мин. 6 символов)',
            'auth/user-not-found': 'Пользователь не найден',
            'auth/wrong-password': 'Неверный пароль',
            'auth/too-many-requests': 'Слишком много попыток',
            'auth/popup-closed-by-user': 'Окно закрыто'
        };
        return errors[code] || 'Произошла ошибка';
    }
    
    isAuthenticated() {
        return auth.currentUser !== null;
    }
}

// ===== MAIN APP =====
class JujutsuFight {
    constructor() {
        this.authService = new Auth();
        this.game = null;
        this.settings = this.loadSettings();
        this.selectedAvatar = '👤';
        
        this.init();
    }
    
    init() {
        this.setup3DBackground();
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.authService.loadUserData(user).then(() => {
                    this.startLoading();
                });
            } else {
                this.startLoading();
            }
        });
    }
    
    startLoading() {
        const progress = document.getElementById('loadingProgress');
        const text = document.getElementById('loadingText');
        
        const steps = [
            { p: 25, t: 'Подключение...' },
            { p: 50, t: 'Загрузка ресурсов...' },
            { p: 75, t: 'Инициализация...' },
            { p: 100, t: 'Готово!' }
        ];
        
        let i = 0;
        const interval = setInterval(() => {
            if (i < steps.length) {
                progress.style.width = steps[i].p + '%';
                text.textContent = steps[i].t;
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => this.onLoadingComplete(), 500);
            }
        }, 400);
    }
    
    onLoadingComplete() {
        if (this.authService.isAuthenticated() && this.authService.currentUser) {
            this.setupApp();
            this.navigateTo('mainMenu');
        } else {
            this.setupAuthScreens();
            this.navigateTo('loginScreen');
        }
    }
    
    setupApp() {
        this.setupNavigation();
        this.setupCharacters();
        this.setupSettings();
        this.setupProfile();
        this.applySettings();
        this.updateUserDisplay();
    }
    
    setup3DBackground() {
        const container = document.getElementById('background3D');
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x0a0a0f, 1);
        container.appendChild(renderer.domElement);
        
        // Particles
        const geometry = new THREE.BufferGeometry();
        const count = 1500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        
        for (let i = 0; i < count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 25;
            positions[i + 1] = (Math.random() - 0.5) * 25;
            positions[i + 2] = (Math.random() - 0.5) * 25;
            
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
        
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        
        const animate = () => {
            requestAnimationFrame(animate);
            particles.rotation.x += 0.0003;
            particles.rotation.y += 0.0005;
            renderer.render(scene, camera);
        };
        
        animate();
        
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    setupAuthScreens() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            
            const result = await this.authService.login(email, password);
            if (result.success) {
                setTimeout(() => {
                    this.setupApp();
                    this.navigateTo('mainMenu');
                }, 500);
            } else {
                errorEl.textContent = result.error;
                errorEl.classList.add('show');
                setTimeout(() => errorEl.classList.remove('show'), 3000);
            }
        });
        
        // Register form
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirm = document.getElementById('registerConfirm').value;
            const errorEl = document.getElementById('registerError');
            
            if (password !== confirm) {
                errorEl.textContent = 'Пароли не совпадают';
                errorEl.classList.add('show');
                setTimeout(() => errorEl.classList.remove('show'), 3000);
                return;
            }
            
            const result = await this.authService.register(email, password, username);
            if (result.success) {
                this.showNotification('🎉 ' + result.message);
                setTimeout(() => {
                    this.setupApp();
                    this.navigateTo('mainMenu');
                }, 1000);
            } else {
                errorEl.textContent = result.error;
                errorEl.classList.add('show');
                setTimeout(() => errorEl.classList.remove('show'), 3000);
            }
        });
        
        // Forgot password
        document.getElementById('forgotForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value;
            const result = await this.authService.resetPassword(email);
            
            if (result.success) {
                document.getElementById('forgotSuccess').textContent = result.message;
                document.getElementById('forgotSuccess').classList.add('show');
            } else {
                document.getElementById('forgotError').textContent = result.error;
                document.getElementById('forgotError').classList.add('show');
            }
        });
        
        // Navigation
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('registerScreen');
        });
        
        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('loginScreen');
        });
        
        document.getElementById('forgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('forgotScreen');
        });
        
        document.getElementById('backToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('loginScreen');
        });
        
        // Social login
        document.getElementById('guestLogin').addEventListener('click', async () => {
            const result = await this.authService.loginAsGuest();
            if (result.success) {
                this.showNotification('👤 Вы вошли как гость');
                setTimeout(() => {
                    this.setupApp();
                    this.navigateTo('mainMenu');
                }, 500);
            }
        });
        
        document.getElementById('googleLogin').addEventListener('click', async () => {
            const result = await this.authService.loginWithGoogle();
            if (result.success) {
                setTimeout(() => {
                    this.setupApp();
                    this.navigateTo('mainMenu');
                }, 500);
            } else {
                this.showNotification('❌ ' + result.error);
            }
        });
        
        // Password toggle
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                input.type = input.type === 'password' ? 'text' : 'password';
                btn.textContent = input.type === 'password' ? '👁️' : '🙈';
            });
        });
        
        // Password strength
        document.getElementById('registerPassword').addEventListener('input', (e) => {
            const password = e.target.value;
            const fill = document.getElementById('strengthFill');
            const text = document.getElementById('strengthText');
            
            fill.className = 'strength-fill';
            text.className = 'strength-text';
            
            if (password.length === 0) {
                text.textContent = 'Введите пароль';
                return;
            }
            
            let strength = 0;
            if (password.length >= 6) strength++;
            if (password.length >= 10) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            if (strength <= 2) {
                fill.classList.add('weak');
                text.classList.add('weak');
                text.textContent = 'Слабый пароль';
            } else if (strength <= 3) {
                fill.classList.add('medium');
                text.classList.add('medium');
                text.textContent = 'Средний пароль';
            } else {
                fill.classList.add('strong');
                text.classList.add('strong');
                text.textContent = 'Надёжный пароль';
            }
        });
    }
    
    setupNavigation() {
        // Play button - show tutorial choice
        document.getElementById('playBtn').addEventListener('click', () => {
            this.showPlayModal();
        });
        
        document.getElementById('charactersBtn').addEventListener('click', () => {
            this.navigateTo('charactersScreen');
        });
        
        document.getElementById('profileBtn').addEventListener('click', () => {
            this.updateProfileDisplay();
            this.navigateTo('profileScreen');
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.navigateTo('settingsScreen');
        });
        
        document.getElementById('aboutBtn').addEventListener('click', () => {
            this.navigateTo('aboutScreen');
        });
        
        document.getElementById('backFromCharacters').addEventListener('click', () => this.navigateTo('mainMenu'));
        document.getElementById('backFromProfile').addEventListener('click', () => this.navigateTo('mainMenu'));
        document.getElementById('backFromSettings').addEventListener('click', () => this.navigateTo('mainMenu'));
        document.getElementById('backFromAbout').addEventListener('click', () => this.navigateTo('mainMenu'));
        
        document.getElementById('backFromGame').addEventListener('click', () => {
            this.stopGame();
            this.navigateTo('mainMenu');
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            if (this.game) this.game.isPaused = !this.game.isPaused;
        });
        
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await this.authService.logout();
            this.showNotification('👋 До свидания!');
            this.setupAuthScreens();
            this.navigateTo('loginScreen');
        });
    }
    
    showPlayModal() {
        const modal = document.createElement('div');
        modal.id = 'playModal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content play-modal">
                <h3>🎮 НАЧАТЬ ИГРУ</h3>
                <p>Хотите пройти обучение?</p>
                <div class="play-options">
                    <button class="menu-btn tutorial-btn" id="startTutorial">
                        <span>📖 ОБУЧЕНИЕ</span>
                        <small>Изучите основы боя</small>
                    </button>
                    <button class="menu-btn skip-btn" id="skipTutorial">
                        <span>⚔️ СРАЗУ В БОЙ</span>
                        <small>Для опытных игроков</small>
                    </button>
                </div>
                <button class="modal-btn cancel" id="cancelPlay">Отмена</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('startTutorial').addEventListener('click', () => {
            modal.remove();
            this.startGame(true);
        });
        
        document.getElementById('skipTutorial').addEventListener('click', () => {
            modal.remove();
            this.startGame(false);
        });
        
        document.getElementById('cancelPlay').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    startGame(tutorial = false) {
        this.navigateTo('gameScreen');
        
        const container = document.getElementById('gameContainer');
        container.innerHTML = '';
        
        this.game = new Game(container, {
            tutorial: tutorial,
            onGameEnd: (playerWon) => {
                this.onGameEnd(playerWon);
            }
        });
        
        // Update HUD names
        document.getElementById('hudPlayerName').textContent = 'Годжо Сатору';
        document.getElementById('hudEnemyName').textContent = 'Сукуна';
    }
    
    onGameEnd(playerWon) {
        setTimeout(() => {
            this.stopGame();
            this.navigateTo('mainMenu');
            
            if (playerWon) {
                this.showNotification('🎉 Победа!');
                this.authService.updateUserProfile({
                    battles: (this.authService.currentUser.battles || 0) + 1,
                    wins: (this.authService.currentUser.wins || 0) + 1,
                    xp: (this.authService.currentUser.xp || 0) + 50
                });
            } else {
                this.showNotification('💀 Поражение...');
                this.authService.updateUserProfile({
                    battles: (this.authService.currentUser.battles || 0) + 1,
                    losses: (this.authService.currentUser.losses || 0) + 1,
                    xp: (this.authService.currentUser.xp || 0) + 10
                });
            }
        }, 1000);
    }
    
    stopGame() {
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
    }
    
    setupCharacters() {
        document.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('click', () => {
                if (card.classList.contains('locked')) {
                    this.showNotification('🔒 Персонаж заблокирован!');
                    return;
                }
                
                document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                const name = card.querySelector('.character-name').textContent;
                this.showNotification(`✓ Выбран: ${name}`);
            });
        });
    }
    
    setupProfile() {
        document.getElementById('editProfileBtn').addEventListener('click', () => {
            const user = this.authService.currentUser;
            document.getElementById('editUsername').value = user.username;
            
            document.querySelectorAll('.avatar-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.avatar === user.avatar) opt.classList.add('selected');
            });
            this.selectedAvatar = user.avatar;
            
            this.openModal('editProfileModal');
        });
        
        document.getElementById('cancelEditProfile').addEventListener('click', () => {
            this.closeModal('editProfileModal');
        });
        
        document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('editUsername').value;
            
            await this.authService.updateUserProfile({
                username,
                avatar: this.selectedAvatar
            });
            
            this.updateUserDisplay();
            this.updateProfileDisplay();
            this.closeModal('editProfileModal');
            this.showNotification('✓ Профиль обновлён');
        });
        
        document.querySelectorAll('.avatar-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.selectedAvatar = opt.dataset.avatar;
            });
        });
        
        document.getElementById('changePasswordBtn').addEventListener('click', () => {
            if (this.authService.currentUser?.isGuest) {
                this.showNotification('🚫 Гости не могут менять пароль');
                return;
            }
            this.openModal('changePasswordModal');
        });
        
        document.getElementById('cancelChangePassword').addEventListener('click', () => {
            this.closeModal('changePasswordModal');
        });
        
        document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const current = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmNewPassword').value;
            const errorEl = document.getElementById('changePasswordError');
            
            if (newPass !== confirm) {
                errorEl.textContent = 'Пароли не совпадают';
                errorEl.classList.add('show');
                return;
            }
            
            const result = await this.authService.changePassword(current, newPass);
            if (result.success) {
                this.closeModal('changePasswordModal');
                this.showNotification('🔑 Пароль изменён');
                document.getElementById('changePasswordForm').reset();
            } else {
                errorEl.textContent = result.error;
                errorEl.classList.add('show');
            }
        });
    }
    
    setupSettings() {
        const musicSlider = document.getElementById('musicVolume');
        const musicValue = document.getElementById('musicValue');
        musicSlider.addEventListener('input', (e) => {
            musicValue.textContent = e.target.value + '%';
            this.settings.musicVolume = parseInt(e.target.value);
        });
        
        const sfxSlider = document.getElementById('sfxVolume');
        const sfxValue = document.getElementById('sfxValue');
        sfxSlider.addEventListener('input', (e) => {
            sfxValue.textContent = e.target.value + '%';
            this.settings.sfxVolume = parseInt(e.target.value);
        });
        
        document.getElementById('vibrationToggle').addEventListener('change', (e) => {
            this.settings.vibration = e.target.checked;
        });
        
        document.getElementById('graphicsQuality').addEventListener('change', (e) => {
            this.settings.graphicsQuality = e.target.value;
        });
        
        document.getElementById('language').addEventListener('change', (e) => {
            this.settings.language = e.target.value;
        });
        
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.settings.difficulty = e.target.value;
        });
        
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
            this.showNotification('💾 Настройки сохранены!');
        });
        
        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
            this.showNotification('🔄 Настройки сброшены!');
        });
    }
    
    loadSettings() {
        const saved = localStorage.getItem('jujutsuSettings');
        return saved ? JSON.parse(saved) : {
            musicVolume: 70,
            sfxVolume: 80,
            vibration: true,
            graphicsQuality: 'medium',
            language: 'ru',
            difficulty: 'normal'
        };
    }
    
    saveSettings() {
        localStorage.setItem('jujutsuSettings', JSON.stringify(this.settings));
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
    
    updateUserDisplay() {
        const user = this.authService.currentUser;
        if (!user) return;
        
        document.getElementById('userAvatar').textContent = user.avatar;
        document.getElementById('userName').textContent = user.username;
        document.getElementById('userLevel').textContent = `Уровень ${user.level}`;
    }
    
    updateProfileDisplay() {
        const user = this.authService.currentUser;
        if (!user) return;
        
        document.getElementById('profileAvatar').textContent = user.avatar;
        document.getElementById('profileName').textContent = user.username;
        document.getElementById('profileEmail').textContent = user.isGuest ? 'Гостевой аккаунт' : user.email;
        document.getElementById('profileLevel').textContent = user.level;
        
        const xpNeeded = user.level * 100;
        const xpPercent = ((user.xp || 0) / xpNeeded) * 100;
        document.getElementById('xpFill').style.width = xpPercent + '%';
        document.getElementById('xpText').textContent = `${user.xp || 0} / ${xpNeeded} XP`;
        
        document.getElementById('statBattles').textContent = user.battles || 0;
        document.getElementById('statWins').textContent = user.wins || 0;
        document.getElementById('statLosses').textContent = user.losses || 0;
        const winrate = (user.battles || 0) > 0 ? Math.round(((user.wins || 0) / user.battles) * 100) : 0;
        document.getElementById('statWinrate').textContent = winrate + '%';
    }
    
    navigateTo(screenId) {
        const current = document.querySelector('.screen.active');
        if (current) {
            current.classList.remove('active');
            setTimeout(() => { current.style.display = 'none'; }, 300);
        }
        
        setTimeout(() => {
            const next = document.getElementById(screenId);
            next.style.display = 'flex';
            setTimeout(() => next.classList.add('active'), 50);
        }, 300);
    }
    
    openModal(id) {
        const modal = document.getElementById(id);
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 50);
    }
    
    closeModal(id) {
        const modal = document.getElementById(id);
        modal.classList.remove('active');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
    
    showNotification(text) {
        const notification = document.getElementById('notification');
        document.getElementById('notificationText').textContent = text;
        notification.classList.add('show');
        
        if (this.settings.vibration && navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        setTimeout(() => notification.classList.remove('show'), 2500);
    }
}

// ===== START =====
window.addEventListener('DOMContentLoaded', () => {
    window.app = new JujutsuFight();
});