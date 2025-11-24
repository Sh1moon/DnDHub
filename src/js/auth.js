class Auth {
    constructor(database) {
        this.db = database;
        this.currentUser = this.getCurrentUser();
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('current_user');
        if (userStr) {
            const userId = JSON.parse(userStr);
            return this.db.getUserById(userId);
        }
        return null;
    }

    setCurrentUser(user) {
        if (user) {
            localStorage.setItem('current_user', JSON.stringify(user.id));
            this.currentUser = user;
        } else {
            localStorage.removeItem('current_user');
            this.currentUser = null;
        }
    }

    register(userData) {
        // Валидация
        const errors = this.validateRegistration(userData);
        if (errors.length > 0) {
            return { success: false, errors };
        }

        // Проверка существующего пользователя
        if (this.db.getUserByEmail(userData.email)) {
            return { success: false, errors: ['Пользователь с таким email уже существует'] };
        }

        // Создание пользователя
        const newUser = this.db.createUser({
            email: userData.email,
            password: this.hashPassword(userData.password),
            name: userData.name,
            role: 'user'
        });

        this.setCurrentUser(newUser);
        return { success: true, user: newUser };
    }

    login(email, password) {
        const user = this.db.getUserByEmail(email);
        if (!user) {
            return { success: false, errors: ['Неверный email или пароль'] };
        }

        if (user.password !== this.hashPassword(password)) {
            return { success: false, errors: ['Неверный email или пароль'] };
        }

        this.setCurrentUser(user);
        return { success: true, user };
    }

    logout() {
        this.setCurrentUser(null);
        return { success: true };
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    validateRegistration(userData) {
        const errors = [];

        if (!userData.email || !this.isValidEmail(userData.email)) {
            errors.push('Введите корректный email');
        }

        if (!userData.password || userData.password.length < 6) {
            errors.push('Пароль должен содержать минимум 6 символов');
        }

        if (userData.password !== userData.confirmPassword) {
            errors.push('Пароли не совпадают');
        }

        if (!userData.name || userData.name.length < 2) {
            errors.push('Имя должно содержать минимум 2 символа');
        }

        return errors;
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    hashPassword(password) {
        // Простое хеширование (в продакшене использовать bcrypt)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.Auth = Auth;
}

