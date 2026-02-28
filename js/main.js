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
        
        this.health = 100;
        this.energy = 100;
        this.isAlive = true;
        this.isBlocking = false;
        this.isAttacking = false;
        this.isJumping = false;
        this.direction = 1;
        
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
        
        // Глаза
        const eyeGeo = new THREE.SphereGeometry(0.05, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pupilGeo = new THREE.SphereGeometry(0.025, 16, 16);
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
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
        this.bodyParts.torso.position.y = 1.3;
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
        this.bodyParts.leftArmGroup.rotation.set(0, 0, 0);
        this.bodyParts.rightArmGroup.rotation.set(0, 0, 0);
        this.bodyParts.leftLegGroup.rotation.set(0, 0, 0);
        this.bodyParts.rightLegGroup.rotation.set(0, 0, 0);
        this.bodyParts.aura.material.opacity = 0;
    }
    
    move(direction) {
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
        if (!this.isJumping && this.mesh.position.y <= 0) {
            this.velocity.y = this.jumpForce;
            this.isJumping = true;
            this.setAnimation('jump');
        }
    }
    
    punch() {
        if (this.isAttacking) return;
        this.isAttacking = true;
        this.setAnimation('punch');
        setTimeout(() => {
            this.isAttacking = false;
            this.setAnimation('idle');
        }, 300);
    }
    
    kick() {
        if (this.isAttacking) return;
        this.isAttacking = true;
        this.setAnimation('kick');
        setTimeout(() => {
            this.isAttacking = false;
            this.setAnimation('idle');
        }, 400);
    }
    
    special() {
        if (this.isAttacking || this.energy < 30) return;
        this.isAttacking = true;
        this.energy -= 30;
        this.setAnimation('special');
        setTimeout(() => {
            this.isAttacking = false;
            this.setAnimation('idle');
        }, 800);
    }
    
    block(isBlocking) {
        this.isBlocking = isBlocking;
        this.setAnimation(isBlocking ? 'block' : 'idle');
    }
}

// ===== GAME CLASS =====
class Game {
    constructor(container) {
        this.container = container;
        this.clock = new THREE.Clock();
        this.keys = {};
        this.isRunning = true;
        
        this.init();
    }
    
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 3, 8);
        this.camera.lookAt(0, 1.5, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        this.setupLighting();
        this.createArena();
        
        // Player
        this.player = new Character(this.scene, {
            name: 'Игрок',
            color: 0x0066ff,
            secondaryColor: 0x003399,
            hairColor: 0xffffff,
            position: { x: -3, y: 0, z: 0 }
        });
        
        // Enemy
        this.enemy = new Character(this.scene, {
            name: 'Враг',
            color: 0xff0000,
            secondaryColor: 0x990000,
            hairColor: 0x000000,
            position: { x: 3, y: 0, z: 0 }
        });
        this.enemy.mesh.rotation.y = Math.PI;
        
        this.setupControls();
        window.addEventListener('resize', () => this.onResize());
        
        this.animate();
    }
    
    setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);
        
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
        
        const rim = new THREE.DirectionalLight(0x0066ff, 0.3);
        rim.position.set(-5, 5, -5);
        this.scene.add(rim);
    }
    
    createArena() {
        // Floor
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Grid
        const grid = new THREE.GridHelper(30, 30, 0x555555, 0x444444);
        this.scene.add(grid);
        
        // Arena borders
        const borderMat = new THREE.MeshStandardMaterial({
            color: 0xff0066,
            transparent: true,
            opacity: 0.3,
            emissive: 0xff0066,
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
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyJ') this.player.punch();
            if (e.code === 'KeyK') this.player.kick();
            if (e.code === 'KeyL') this.player.special();
            if (e.code === 'Space') { e.preventDefault(); this.player.jump(); }
            if (e.code === 'ShiftLeft') this.player.block(true);
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ShiftLeft') this.player.block(false);
        });
        
        // Mobile controls
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        const joystick = document.getElementById('joystick');
        const knob = document.getElementById('joystickKnob');
        
        if (!joystick) return;
        
        let joystickActive = false;
        
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
            joystickActive = false;
        };
        
        joystick.addEventListener('touchstart', (e) => { joystickActive = true; handleJoystick(e); });
        joystick.addEventListener('touchmove', handleJoystick);
        joystick.addEventListener('touchend', resetJoystick);
        
        // Action buttons
        document.getElementById('btnPunch')?.addEventListener('touchstart', () => this.player.punch());
        document.getElementById('btnKick')?.addEventListener('touchstart', () => this.player.kick());
        document.getElementById('btnSpecial')?.addEventListener('touchstart', () => this.player.special());
        document.getElementById('btnJump')?.addEventListener('touchstart', () => this.player.jump());
        document.getElementById('btnBlock')?.addEventListener('touchstart', () => this.player.block(true));
        document.getElementById('btnBlock')?.addEventListener('touchend', () => this.player.block(false));
    }
    
    update(delta) {
        if (!this.isRunning) return;
        
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
        
        // Update HUD
        this.updateHUD();
        
        // Camera follow
        this.camera.position.x = (this.player.mesh.position.x + this.enemy.mesh.position.x) / 2;
        this.camera.lookAt(
            (this.player.mesh.position.x + this.enemy.mesh.position.x) / 2,
            1.5,
            0
        );
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
    
    destroy() {
        this.isRunning = false;
        this.renderer.dispose();
        this.container.innerHTML = '';
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
        
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                input.type = input.type === 'password' ? 'text' : 'password';
                btn.textContent = input.type === 'password' ? '👁️' : '🙈';
            });
        });
        
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
        document.getElementById('playBtn').addEventListener('click', () => {
            this.startGame();
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
            if (this.game) this.game.isRunning = !this.game.isRunning;
        });
        
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await this.authService.logout();
            this.showNotification('👋 До свидания!');
            this.setupAuthScreens();
            this.navigateTo('loginScreen');
        });
    }
    
    startGame() {
        this.navigateTo('gameScreen');
        const container = document.getElementById('gameContainer');
        container.innerHTML = '';
        this.game = new Game(container);
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
        const xpPercent = (user.xp / xpNeeded) * 100;
        document.getElementById('xpFill').style.width = xpPercent + '%';
        document.getElementById('xpText').textContent = `${user.xp} / ${xpNeeded} XP`;
        
        document.getElementById('statBattles').textContent = user.battles;
        document.getElementById('statWins').textContent = user.wins;
        document.getElementById('statLosses').textContent = user.losses;
        const winrate = user.battles > 0 ? Math.round((user.wins / user.battles) * 100) : 0;
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