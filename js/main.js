// ===== ИМПОРТЫ FIREBASE =====
import { 
    auth, 
    db,
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
    sendEmailVerification,
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    runTransaction
} from './firebase-config.js';

// ===== КЛАСС АВТОРИЗАЦИИ С FIREBASE =====
class Auth {
    constructor() {
        this.currentUser = null;
        this.unsubscribe = null;
        
        // Слушаем изменения состояния авторизации
        this.setupAuthListener();
    }
    
    setupAuthListener() {
        this.unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Пользователь вошёл
                await this.loadUserData(user);
            } else {
                // Пользователь вышел
                this.currentUser = null;
            }
        });
    }
    
    async loadUserData(firebaseUser) {
        try {
            // Получаем данные пользователя из Firestore
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    emailVerified: firebaseUser.emailVerified,
                    ...userDoc.data()
                };
            } else {
                // Создаём профиль для нового пользователя
                await this.createUserProfile(firebaseUser);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }
    
    async createUserProfile(firebaseUser) {
        const username = firebaseUser.displayName || firebaseUser.email.split('@')[0];
        
        const userData = {
            username: username,
            email: firebaseUser.email,
            avatar: '👤',
            level: 1,
            xp: 0,
            battles: 0,
            wins: 0,
            losses: 0,
            unlockedCharacters: ['gojo', 'itadori', 'megumi'],
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        };
        
        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            await setDoc(userDocRef, userData);
            
            this.currentUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                emailVerified: firebaseUser.emailVerified,
                ...userData
            };
            
            console.log('✓ Профиль создан');
        } catch (error) {
            console.error('Ошибка создания профиля:', error);
            throw error;
        }
    }
    
    async register(email, password, username) {
        try {
            // Создаём пользователя в Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Обновляем displayName
            await updateProfile(user, {
                displayName: username
            });
            
            // Создаём профиль в Firestore
            const userData = {
                username: username,
                email: email,
                avatar: '👤',
                level: 1,
                xp: 0,
                battles: 0,
                wins: 0,
                losses: 0,
                unlockedCharacters: ['gojo', 'itadori', 'megumi'],
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            };
            
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, userData);
            
            // Отправляем письмо подтверждения
            await sendEmailVerification(user);
            
            return { 
                success: true, 
                message: 'Регистрация успешна! Проверьте email для подтверждения.' 
            };
            
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error.code) 
            };
        }
    }
    
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // Обновляем время последнего входа
            const userDocRef = doc(db, 'users', userCredential.user.uid);
            await updateDoc(userDocRef, {
                lastLogin: serverTimestamp()
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Ошибка входа:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error.code) 
            };
        }
    }
    
    async loginWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            
            const result = await signInWithPopup(auth, provider);
            
            // Проверяем, есть ли профиль
            const userDocRef = doc(db, 'users', result.user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                // Создаём профиль для нового пользователя Google
                await this.createUserProfile(result.user);
            } else {
                // Обновляем время входа
                await updateDoc(userDocRef, {
                    lastLogin: serverTimestamp()
                });
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Ошибка входа через Google:', error);
            
            // Обработка специфичных ошибок popup
            if (error.code === 'auth/popup-closed-by-user') {
                return { success: false, error: 'Окно входа было закрыто' };
            }
            if (error.code === 'auth/cancelled-popup-request') {
                return { success: false, error: 'Запрос отменён' };
            }
            
            return { 
                success: false, 
                error: this.getErrorMessage(error.code) 
            };
        }
    }
    
    async loginAsGuest() {
        try {
            const userCredential = await signInAnonymously(auth);
            
            // Создаём временный профиль
            const guestData = {
                username: 'Гость_' + Math.floor(Math.random() * 10000),
                email: 'guest@anonymous.com',
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
            
            const userDocRef = doc(db, 'users', userCredential.user.uid);
            await setDoc(userDocRef, guestData);
            
            return { success: true };
            
        } catch (error) {
            console.error('Ошибка гостевого входа:', error);
            return { 
                success: false, 
                error: 'Не удалось войти как гость' 
            };
        }
    }
    
    async logout() {
        try {
            await signOut(auth);
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Ошибка выхода:', error);
            return { success: false, error: 'Ошибка выхода' };
        }
    }
    
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            return { 
                success: true, 
                message: 'Инструкции отправлены на email' 
            };
        } catch (error) {
            console.error('Ошибка сброса пароля:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error.code) 
            };
        }
    }
    
    async updateProfile(updates) {
        if (!this.currentUser) return { success: false, error: 'Не авторизован' };
        
        try {
            const uid = this.currentUser.uid;
            
            // Обновляем в Firestore
            const userDocRef = doc(db, 'users', uid);
            await updateDoc(userDocRef, updates);
            
            // Обновляем локальные данные
            Object.assign(this.currentUser, updates);
            
            // Если обновляется username, обновляем и в Firebase Auth
            if (updates.username && auth.currentUser) {
                await updateProfile(auth.currentUser, {
                    displayName: updates.username
                });
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            return { success: false, error: 'Не удалось обновить профиль' };
        }
    }
    
    async changePassword(currentPassword, newPassword) {
        if (!this.currentUser || this.currentUser.isGuest) {
            return { success: false, error: 'Невозможно сменить пароль' };
        }
        
        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            
            // Переаутентификация
            await reauthenticateWithCredential(user, credential);
            
            // Смена пароля
            await updatePassword(user, newPassword);
            
            return { success: true };
            
        } catch (error) {
            console.error('Ошибка смены пароля:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error.code) 
            };
        }
    }
    
    async updateStats(updates) {
        if (!this.currentUser) return;
        
        try {
            const uid = this.currentUser.uid;
            const userDocRef = doc(db, 'users', uid);
            
            // Используем транзакцию для безопасного обновления
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                
                if (!userDoc.exists()) {
                    throw new Error('Профиль не найден');
                }
                
                const currentData = userDoc.data();
                const newData = {};
                
                // Обновляем счётчики
                if (updates.battles) newData.battles = (currentData.battles || 0) + updates.battles;
                if (updates.wins) newData.wins = (currentData.wins || 0) + updates.wins;
                if (updates.losses) newData.losses = (currentData.losses || 0) + updates.losses;
                
                if (updates.xp) {
                    const newXp = (currentData.xp || 0) + updates.xp;
                    const xpNeeded = currentData.level * 100;
                    
                    if (newXp >= xpNeeded) {
                        // Повышение уровня
                        newData.level = (currentData.level || 1) + 1;
                        newData.xp = newXp - xpNeeded;
                    } else {
                        newData.xp = newXp;
                    }
                }
                
                transaction.update(userDocRef, newData);
                
                // Обновляем локально
                Object.assign(this.currentUser, newData);
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Ошибка обновления статистики:', error);
            return { success: false };
        }
    }
    
    async getLeaderboard(limitCount = 10) {
        try {
            const usersRef = collection(db, 'users');
            const q = query(
                usersRef,
                where('isGuest', '!=', true),
                orderBy('level', 'desc'),
                orderBy('xp', 'desc'),
                limit(limitCount)
            );
            
            const snapshot = await getDocs(q);
            const leaderboard = [];
            
            snapshot.forEach((doc) => {
                leaderboard.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return leaderboard;
            
        } catch (error) {
            console.error('Ошибка загрузки таблицы лидеров:', error);
            return [];
        }
    }
    
    getErrorMessage(errorCode) {
        const errors = {
            'auth/email-already-in-use': 'Email уже используется',
            'auth/invalid-email': 'Неверный формат email',
            'auth/operation-not-allowed': 'Операция не разрешена',
            'auth/weak-password': 'Слишком слабый пароль (минимум 6 символов)',
            'auth/user-disabled': 'Аккаунт заблокирован',
            'auth/user-not-found': 'Пользователь не найден',
            'auth/wrong-password': 'Неверный пароль',
            'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже',
            'auth/network-request-failed': 'Ошибка сети. Проверьте подключение',
            'auth/popup-closed-by-user': 'Окно входа было закрыто',
            'auth/cancelled-popup-request': 'Запрос отменён',
            'auth/requires-recent-login': 'Требуется повторный вход',
            'auth/invalid-credential': 'Неверные учётные данные'
        };
        
        return errors[errorCode] || 'Произошла ошибка';
    }
    
    isAuthenticated() {
        return auth.currentUser !== null;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
}

// ===== КЛАСС ПРИЛОЖЕНИЯ =====
class JujutsuFight {
    constructor() {
        this.authService = new Auth();
        this.currentScreen = 'loadingScreen';
        this.selectedCharacter = null;
        this.selectedAvatar = '👤';
        this.settings = this.loadSettings();
        
        this.init();
    }
    
    init() {
        this.setup3DBackground();
        
        // Ждём инициализации Firebase Auth
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Отписываемся после первой проверки
            this.startLoading();
        });
    }
    
    startLoading() {
        const progressBar = document.getElementById('loadingProgress');
        const loadingText = document.getElementById('loadingText');
        
        const loadingSteps = [
            { progress: 20, text: 'Подключение к Firebase...' },
            { progress: 40, text: 'Загрузка ресурсов...' },
            { progress: 60, text: 'Инициализация графики...' },
            { progress: 80, text: 'Загрузка персонажей...' },
            { progress: 100, text: 'Готово!' }
        ];
        
        let step = 0;
        const interval = setInterval(() => {
            if (step < loadingSteps.length) {
                progressBar.style.width = loadingSteps[step].progress + '%';
                loadingText.textContent = loadingSteps[step].text;
                step++;
            } else {
                clearInterval(interval);
                setTimeout(() => this.onLoadingComplete(), 500);
            }
        }, 400);
    }
    
    onLoadingComplete() {
        // Проверяем авторизацию
        if (this.authService.isAuthenticated()) {
            // Ждём загрузки данных пользователя
            const checkUser = setInterval(() => {
                if (this.authService.currentUser) {
                    clearInterval(checkUser);
                    this.setupApp();
                    this.navigateTo('mainMenu');
                }
            }, 100);
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
        
        console.log('✓ Приложение готово');
    }
    
    // ===== 3D ФОН =====
    setup3DBackground() {
        const container = document.getElementById('background3D');
        
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x0a0a0f, 1);
        container.appendChild(this.renderer.domElement);
        
        this.createParticles();
        this.createShapes();
        this.animate();
        
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
        
        if (this.particles) {
            this.particles.rotation.x += 0.0003;
            this.particles.rotation.y += 0.0005;
        }
        
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
    
    // ===== АВТОРИЗАЦИЯ =====
    setupAuthScreens() {
        // Форма входа
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
        
        // Форма регистрации
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });
        
        // Форма восстановления
        document.getElementById('forgotForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleForgotPassword();
        });
        
        // Переключение между формами
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.clearFormErrors();
            this.navigateTo('registerScreen');
        });
        
        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.clearFormErrors();
            this.navigateTo('loginScreen');
        });
        
        document.getElementById('forgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            this.clearFormErrors();
            this.navigateTo('forgotScreen');
        });
        
        document.getElementById('backToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.clearFormErrors();
            this.navigateTo('loginScreen');
        });
        
        // Вход как гость
        document.getElementById('guestLogin').addEventListener('click', async () => {
            this.showButtonLoading('guestLogin', true);
            const result = await this.authService.loginAsGuest();
            this.showButtonLoading('guestLogin', false);
            
            if (result.success) {
                this.showNotification('👤 Вы вошли как гость');
                setTimeout(() => {
                    this.setupApp();
                    this.navigateTo('mainMenu');
                }, 500);
            } else {
                this.showNotification('❌ ' + result.error);
            }
        });
        
        // Google вход
        document.getElementById('googleLogin').addEventListener('click', async () => {
            this.showButtonLoading('googleLogin', true);
            const result = await this.authService.loginWithGoogle();
            this.showButtonLoading('googleLogin', false);
            
            if (result.success) {
                this.showNotification('✓ Вход выполнен');
                setTimeout(() => {
                    this.setupApp();
                    this.navigateTo('mainMenu');
                }, 500);
            } else {
                this.showNotification('❌ ' + result.error);
            }
        });
        
        // Показать/скрыть пароль
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.textContent = '🙈';
                } else {
                    input.type = 'password';
                    btn.textContent = '👁️';
                }
            });
        });
        
        // Сила пароля
        document.getElementById('registerPassword').addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });
        
        // Условия
        document.getElementById('termsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showNotification('📜 Пользовательское соглашение');
        });
    }
    
    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        
        this.showButtonLoading(submitBtn, true);
        
        const result = await this.authService.login(email, password);
        
        this.showButtonLoading(submitBtn, false);
        
        if (result.success) {
            this.showNotification('✓ Вход выполнен');
            setTimeout(() => {
                this.setupApp();
                this.navigateTo('mainMenu');
            }, 500);
        } else {
            errorEl.textContent = result.error;
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 4000);
        }
    }
    
    async handleRegister() {
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('registerConfirm').value;
        const errorEl = document.getElementById('registerError');
        const submitBtn = document.querySelector('#registerForm button[type="submit"]');
        
        // Валидация
        if (password !== confirm) {
            errorEl.textContent = 'Пароли не совпадают';
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 3000);
            return;
        }
        
        if (password.length < 6) {
            errorEl.textContent = 'Пароль должен быть минимум 6 символов';
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 3000);
            return;
        }
        
        if (username.length < 3) {
            errorEl.textContent = 'Имя должно быть минимум 3 символа';
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 3000);
            return;
        }
        
        this.showButtonLoading(submitBtn, true);
        
        const result = await this.authService.register(email, password, username);
        
        this.showButtonLoading(submitBtn, false);
        
        if (result.success) {
            this.showNotification('🎉 ' + result.message);
            setTimeout(() => {
                this.setupApp();
                this.navigateTo('mainMenu');
            }, 1000);
        } else {
            errorEl.textContent = result.error;
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 4000);
        }
    }
    
    async handleForgotPassword() {
        const email = document.getElementById('forgotEmail').value.trim();
        const errorEl = document.getElementById('forgotError');
        const successEl = document.getElementById('forgotSuccess');
        const submitBtn = document.querySelector('#forgotForm button[type="submit"]');
        
        this.showButtonLoading(submitBtn, true);
        
        const result = await this.authService.resetPassword(email);
        
        this.showButtonLoading(submitBtn, false);
        
        if (result.success) {
            successEl.textContent = result.message;
            successEl.classList.add('show');
            document.getElementById('forgotEmail').value = '';
            setTimeout(() => successEl.classList.remove('show'), 5000);
        } else {
            errorEl.textContent = result.error;
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 4000);
        }
    }
    
    clearFormErrors() {
        document.querySelectorAll('.auth-error, .auth-success').forEach(el => {
            el.classList.remove('show');
        });
    }
    
    checkPasswordStrength(password) {
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
    }
    
    showButtonLoading(btn, show) {
        if (typeof btn === 'string') {
            btn = document.getElementById(btn);
        }
        
        if (!btn) return;
        
        if (show) {
            btn.dataset.originalText = btn.textContent;
            btn.textContent = '⏳ Загрузка...';
            btn.disabled = true;
        } else {
            if (btn.dataset.originalText) {
                btn.textContent = btn.dataset.originalText;
            }
            btn.disabled = false;
        }
    }
    
    // ===== НАВИГАЦИЯ =====
    setupNavigation() {
        document.getElementById('playBtn').addEventListener('click', () => {
            this.showNotification('🎮 Игра в разработке!');
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
        
        // Кнопки назад
        document.getElementById('backFromCharacters').addEventListener('click', () => {
            this.navigateTo('mainMenu');
        });
        
        document.getElementById('backFromProfile').addEventListener('click', () => {
            this.navigateTo('mainMenu');
        });
        
        document.getElementById('backFromSettings').addEventListener('click', () => {
            this.navigateTo('mainMenu');
        });
        
        document.getElementById('backFromAbout').addEventListener('click', () => {
            this.navigateTo('mainMenu');
        });
        
        // Выход
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
    }
    
    navigateTo(screenId) {
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen) {
            currentScreen.classList.remove('active');
            setTimeout(() => {
                currentScreen.style.display = 'none';
            }, 300);
        }
        
        setTimeout(() => {
            const newScreen = document.getElementById(screenId);
            newScreen.style.display = 'flex';
            setTimeout(() => {
                newScreen.classList.add('active');
            }, 50);
        }, 300);
        
        this.currentScreen = screenId;
    }
    
    async handleLogout() {
        const result = await this.authService.logout();
        if (result.success) {
            this.showNotification('👋 До свидания!');
            setTimeout(() => {
                this.setupAuthScreens();
                this.navigateTo('loginScreen');
            }, 500);
        }
    }
    
    updateUserDisplay() {
        if (!this.authService.currentUser) return;
        
        const user = this.authService.currentUser;
        document.getElementById('userAvatar').textContent = user.avatar;
        document.getElementById('userName').textContent = user.username;
        document.getElementById('userLevel').textContent = `Уровень ${user.level}`;
    }
    
    // ===== ПРОФИЛЬ =====
    setupProfile() {
        document.getElementById('editProfileBtn').addEventListener('click', () => {
            this.openEditProfileModal();
        });
        
        document.getElementById('cancelEditProfile').addEventListener('click', () => {
            this.closeModal('editProfileModal');
        });
        
        document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProfileEdits();
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
            await this.handleChangePassword();
        });
        
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedAvatar = option.dataset.avatar;
            });
        });
    }
    
    openEditProfileModal() {
        const user = this.authService.currentUser;
        document.getElementById('editUsername').value = user.username;
        
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.avatar === user.avatar) {
                option.classList.add('selected');
            }
        });
        this.selectedAvatar = user.avatar;
        
        this.openModal('editProfileModal');
    }
    
    async saveProfileEdits() {
        const newUsername = document.getElementById('editUsername').value.trim();
        
        if (newUsername.length < 3) {
            this.showNotification('❌ Имя слишком короткое');
            return;
        }
        
        const result = await this.authService.updateProfile({
            username: newUsername,
            avatar: this.selectedAvatar
        });
        
        if (result.success) {
            this.updateUserDisplay();
            this.updateProfileDisplay();
            this.closeModal('editProfileModal');
            this.showNotification('✓ Профиль обновлён');
        } else {
            this.showNotification('❌ ' + result.error);
        }
    }
    
    async handleChangePassword() {
        const current = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmNewPassword').value;
        const errorEl = document.getElementById('changePasswordError');
        
        if (newPass !== confirm) {
            errorEl.textContent = 'Пароли не совпадают';
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 3000);
            return;
        }
        
        if (newPass.length < 6) {
            errorEl.textContent = 'Пароль должен быть минимум 6 символов';
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 3000);
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
            setTimeout(() => errorEl.classList.remove('show'), 4000);
        }
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
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 50);
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    
    // ===== ПЕРСОНАЖИ =====
    setupCharacters() {
        const cards = document.querySelectorAll('.character-card');
        
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const user = this.authService.currentUser;
                const characterId = card.dataset.character;
                
                if (card.classList.contains('locked')) {
                    if (!user.unlockedCharacters.includes(characterId)) {
                        this.showNotification('🔒 Персонаж заблокирован!');
                        return;
                    }
                }
                
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                const characterName = card.querySelector('.character-name').textContent;
                this.selectedCharacter = characterId;
                this.showNotification(`✓ Выбран: ${characterName}`);
            });
        });
    }
    
    // ===== НАСТРОЙКИ =====
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