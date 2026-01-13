/**
 * Система авторизации SCM Академия
 * Полная версия с регистрацией, восстановлением пароля и управлением пользователями
 */

class AuthSystem {
    constructor() {
        this.users = {
            'superadmin': {
                password: 'SCM2024!',
                role: 'superadmin',
                name: 'Иван Иванов',
                email: 'superadmin@scm-academy.ru',
                permissions: ['all'],
                created: '2024-01-01',
                lastLogin: new Date().toISOString()
            },
            'admin': {
                password: 'AdminPass123',
                role: 'admin',
                name: 'Анна Дмитриева',
                email: 'admin@scm-academy.ru',
                permissions: ['manage_users', 'manage_courses', 'manage_content', 'view_analytics'],
                created: '2024-01-02',
                lastLogin: new Date().toISOString()
            },
            'teacher': {
                password: 'Teach2024#',
                role: 'teacher',
                name: 'Мария Сидорова',
                email: 'teacher@scm-academy.ru',
                permissions: ['manage_courses', 'grade_assignments', 'view_students', 'create_content'],
                created: '2024-01-03',
                lastLogin: new Date().toISOString()
            },
            'student': {
                password: 'Student2024$',
                role: 'student',
                name: 'Алексей Петров',
                email: 'student@scm-academy.ru',
                permissions: ['view_courses', 'submit_assignments', 'view_grades', 'participate_discussions'],
                created: '2024-01-04',
                lastLogin: new Date().toISOString()
            },
            'demo_admin': {
                password: 'Demo123!',
                role: 'admin',
                name: 'Демо Администратор',
                email: 'demo@scm-academy.ru',
                permissions: ['manage_courses', 'view_analytics'],
                created: '2024-01-05',
                lastLogin: new Date().toISOString()
            }
        };
        
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 часа
        this.rememberTimeout = 30 * 24 * 60 * 60 * 1000; // 30 дней
        
        // Инициализация
        this.init();
    }
    
    init() {
        this.checkSession();
        this.setupLogoutButtons();
        this.updateUserInterface();
        
        // Проверяем auto-login при загрузке
        const url = window.location.pathname;
        if (!url.includes('login.html') && !url.includes('index.html')) {
            const remembered = localStorage.getItem('scm_user_remember');
            if (remembered && !sessionStorage.getItem('scm_user')) {
                this.autoLogin();
            }
        }
    }
    
    // Вход в систему
    login(username, password, rememberMe = false) {
        const user = this.users[username];
        
        if (!user) {
            return {
                success: false,
                message: 'Пользователь не найден. Проверьте имя пользователя.'
            };
        }
        
        if (user.password !== password) {
            return {
                success: false,
                message: 'Неверный пароль. Попробуйте снова.'
            };
        }
        
        // Обновляем время последнего входа
        user.lastLogin = new Date().toISOString();
        
        // Создаем объект сессии
        const sessionData = {
            username: username,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            timestamp: new Date().getTime(),
            lastLogin: user.lastLogin
        };
        
        // Сохраняем в sessionStorage (для текущей сессии)
        sessionStorage.setItem('scm_user', JSON.stringify(sessionData));
        
        // Если выбрано "Запомнить меня", сохраняем в localStorage
        if (rememberMe) {
            localStorage.setItem('scm_user_remember', JSON.stringify({
                username: username,
                password: password,
                timestamp: new Date().getTime()
            }));
        } else {
            localStorage.removeItem('scm_user_remember');
        }
        
        // Логируем вход
        console.log(`Пользователь ${user.name} вошел в систему как ${user.role}`);
        
        return {
            success: true,
            user: sessionData,
            redirectTo: this.getDashboardUrl(user.role)
        };
    }
    
    // Автоматический вход (при "Запомнить меня")
    autoLogin() {
        const remembered = localStorage.getItem('scm_user_remember');
        
        if (!remembered) return false;
        
        try {
            const rememberData = JSON.parse(remembered);
            const user = this.users[rememberData.username];
            
            if (!user) return false;
            
            // Проверяем, не прошло ли 30 дней
            const rememberAge = new Date().getTime() - rememberData.timestamp;
            
            if (rememberAge > this.rememberTimeout) {
                localStorage.removeItem('scm_user_remember');
                return false;
            }
            
            // Автоматически логиним
            return this.login(rememberData.username, rememberData.password, true);
        } catch (error) {
            console.error('Ошибка при автоматическом входе:', error);
            return false;
        }
    }
    
    // Получение URL для перенаправления по роли
    getDashboardUrl(role) {
        const urls = {
            'superadmin': 'superadmin/index.html',
            'admin': 'admin/index.html',
            'teacher': 'teacher/index.html',
            'student': 'student/index.html'
        };
        
        return urls[role] || 'dashboard.html';
    }
    
    // Проверка текущей сессии
    checkSession() {
        const userData = sessionStorage.getItem('scm_user');
        
        if (!userData) {
            // Проверяем, не на странице ли входа или главной
            const currentPath = window.location.pathname;
            if (!currentPath.includes('login.html') && 
                !currentPath.includes('index.html') &&
                !currentPath.includes('request-access.html') &&
                !currentPath.includes('reset-password.html')) {
                this.redirectToLogin();
            }
            return false;
        }
        
        try {
            const user = JSON.parse(userData);
            
            // Проверка времени сессии
            const sessionAge = new Date().getTime() - user.timestamp;
            if (sessionAge > this.sessionTimeout) {
                sessionStorage.removeItem('scm_user');
                localStorage.removeItem('scm_user_remember');
                
                // Показываем сообщение только если не на странице входа
                if (!window.location.pathname.includes('login.html')) {
                    alert('Ваша сессия истекла. Пожалуйста, войдите снова.');
                }
                
                this.redirectToLogin();
                return false;
            }
            
            // Проверка доступа к текущей странице
            if (!this.checkPageAccess(user.role)) {
                alert('У вас нет доступа к этой странице.');
                this.redirectToDashboard();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка при проверке сессии:', error);
            this.redirectToLogin();
            return false;
        }
    }
    
    // Проверка доступа к странице на основе роли
    checkPageAccess(userRole) {
        const currentPath = window.location.pathname;
        
        // Разрешаем доступ к общим страницам
        const publicPages = [
            'login.html',
            'index.html',
            'request-access.html',
            'reset-password.html',
            'dashboard.html'
        ];
        
        if (publicPages.some(page => currentPath.includes(page))) {
            return true;
        }
        
        // Определяем требуемую роль для текущей страницы
        const pageRoles = {
            'superadmin': ['superadmin'],
            'admin': ['superadmin', 'admin'],
            'teacher': ['superadmin', 'admin', 'teacher'],
            'student': ['superadmin', 'admin', 'teacher', 'student']
        };
        
        // Определяем тип страницы
        let pageType = '';
        if (currentPath.includes('superadmin')) {
            pageType = 'superadmin';
        } else if (currentPath.includes('admin')) {
            pageType = 'admin';
        } else if (currentPath.includes('teacher')) {
            pageType = 'teacher';
        } else if (currentPath.includes('student')) {
            pageType = 'student';
        } else {
            return true;
        }
        
        // Проверяем, есть ли у пользователя доступ
        return pageRoles[pageType]?.includes(userRole) || false;
    }
    
    // Обновление интерфейса пользователя
    updateUserInterface() {
        const userData = sessionStorage.getItem('scm_user');
        
        if (!userData) return;
        
        try {
            const user = JSON.parse(userData);
            
            // Обновляем имя пользователя
            const userNameElements = document.querySelectorAll('.user-name, .user-display-name');
            userNameElements.forEach(el => {
                if (el.classList.contains('user-name') || el.classList.contains('user-display-name')) {
                    el.textContent = user.name;
                }
            });
            
            // Обновляем роль
            const roleElements = document.querySelectorAll('.user-role');
            const roleNames = {
                'superadmin': 'Супер-Администратор',
                'admin': 'Администратор',
                'teacher': 'Преподаватель',
                'student': 'Студент'
            };
            
            roleElements.forEach(el => {
                el.textContent = roleNames[user.role] || user.role;
            });
            
            // Обновляем аватар с инициалами
            const avatarElements = document.querySelectorAll('.user-avatar');
            if (avatarElements.length > 0) {
                const initials = user.name.split(' ').map(n => n[0]).join('');
                avatarElements.forEach(avatar => {
                    avatar.textContent = initials;
                });
            }
            
            // Обновляем email если есть элемент
            const emailElements = document.querySelectorAll('.user-email');
            emailElements.forEach(el => {
                el.textContent = user.email;
            });
            
            // Скрываем/показываем элементы в зависимости от роли
            this.applyRoleBasedUI(user.role);
        } catch (error) {
            console.error('Ошибка при обновлении интерфейса:', error);
        }
    }
    
    // Применение UI в зависимости от роли
    applyRoleBasedUI(role) {
        // Скрываем элементы не для текущей роли
        const roleBasedElements = {
            'superadmin': ['.superadmin-only'],
            'admin': ['.admin-only', '.superadmin-only'],
            'teacher': ['.teacher-only', '.admin-only', '.superadmin-only'],
            'student': ['.student-only', '.teacher-only', '.admin-only', '.superadmin-only']
        };
        
        // Сначала скрываем все элементы, связанные с ролями
        Object.values(roleBasedElements).flat().forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
            });
        });
        
        // Показываем только элементы для текущей роли и выше
        for (const [roleKey, selectors] of Object.entries(roleBasedElements)) {
            if (this.getRoleLevel(role) >= this.getRoleLevel(roleKey)) {
                selectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        el.style.display = '';
                    });
                });
            }
        }
    }
    
    // Уровень роли для сравнения
    getRoleLevel(role) {
        const levels = {
            'superadmin': 4,
            'admin': 3,
            'teacher': 2,
            'student': 1
        };
        return levels[role] || 0;
    }
    
    // Настройка кнопок выхода
    setupLogoutButtons() {
        const logoutButtons = document.querySelectorAll('.logout-btn, [data-action="logout"], #logoutButton');
        
        logoutButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
        
        // Также добавляем обработчик для ссылок с href="#logout"
        document.querySelectorAll('a[href="#logout"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }
    
    // Выход из системы
    logout() {
        if (confirm('Вы уверены, что хотите выйти из системы?')) {
            // Сохраняем информацию о выходе для аналитики
            const userData = sessionStorage.getItem('scm_user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    console.log(`Пользователь ${user.name} вышел из системы`);
                } catch (error) {
                    console.error('Ошибка при логировании выхода:', error);
                }
            }
            
            // Очищаем данные сессии
            sessionStorage.removeItem('scm_user');
            localStorage.removeItem('scm_user_remember');
            
            // Перенаправляем на страницу входа
            window.location.href = 'login.html';
        }
    }
    
    // Перенаправление на страницу входа
    redirectToLogin() {
        if (!window.location.pathname.includes('login.html') &&
            !window.location.pathname.includes('index.html')) {
            window.location.href = 'login.html';
        }
    }
    
    // Перенаправление на главную дашборда
    redirectToDashboard() {
        const userData = sessionStorage.getItem('scm_user');
        if (userData) {
            const user = JSON.parse(userData);
            window.location.href = this.getDashboardUrl(user.role);
        } else {
            window.location.href = 'index.html';
        }
    }
    
    // Получение данных текущего пользователя
    getCurrentUser() {
        const userData = sessionStorage.getItem('scm_user');
        return userData ? JSON.parse(userData) : null;
    }
    
    // Проверка прав доступа
    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        const userData = this.users[user.username];
        return userData?.permissions?.includes('all') || 
               userData?.permissions?.includes(permission) || 
               false;
    }
    
    // Проверка роли
    hasRole(role) {
        const user = this.getCurrentUser();
        return user?.role === role;
    }
    
    // Обновление сессии (продление времени)
    refreshSession() {
        const user = this.getCurrentUser();
        if (user) {
            user.timestamp = new Date().getTime();
            sessionStorage.setItem('scm_user', JSON.stringify(user));
            return true;
        }
        return false;
    }
    
    // Проверка пароля на сложность
    validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (password.length < minLength) {
            return { valid: false, message: 'Пароль должен содержать минимум 8 символов' };
        }
        
        if (!hasUpperCase || !hasLowerCase) {
            return { valid: false, message: 'Пароль должен содержать заглавные и строчные буквы' };
        }
        
        if (!hasNumbers) {
            return { valid: false, message: 'Пароль должен содержать цифры' };
        }
        
        if (!hasSpecialChar) {
            return { valid: false, message: 'Пароль должен содержать специальные символы (!@#$% и т.д.)' };
        }
        
        return { valid: true, message: 'Пароль соответствует требованиям' };
    }
    
    // Восстановление пароля
    initiatePasswordReset(email) {
        // Ищем пользователя по email
        const username = Object.keys(this.users).find(
            key => this.users[key].email === email
        );
        
        if (!username) {
            return {
                success: false,
                message: 'Пользователь с таким email не найден'
            };
        }
        
        // Генерируем временный токен для сброса пароля
        const resetToken = Math.random().toString(36).substring(2) + 
                          Date.now().toString(36);
        
        // Сохраняем токен
        localStorage.setItem(`scm_reset_token_${username}`, JSON.stringify({
            token: resetToken,
            expires: new Date().getTime() + 3600000, // 1 час
            email: email
        }));
        
        // В реальном приложении здесь была бы отправка email
        console.log(`Токен сброса пароля для ${email}: ${resetToken}`);
        
        return {
            success: true,
            message: `Инструкции по сбросу пароля отправлены на ${email}`,
            token: resetToken // Для демо-целей
        };
    }
    
    // Сброс пароля с токеном
    resetPassword(token, newPassword) {
        // Находим пользователя по токену
        const username = Object.keys(this.users).find(key => {
            const storedToken = localStorage.getItem(`scm_reset_token_${key}`);
            if (!storedToken) return false;
            
            try {
                const tokenData = JSON.parse(storedToken);
                return tokenData.token === token && 
                       tokenData.expires > new Date().getTime();
            } catch {
                return false;
            }
        });
        
        if (!username) {
            return {
                success: false,
                message: 'Неверный или просроченный токен сброса'
            };
        }
        
        // Проверяем сложность нового пароля
        const validation = this.validatePassword(newPassword);
        if (!validation.valid) {
            return {
                success: false,
                message: validation.message
            };
        }
        
        // Обновляем пароль
        this.users[username].password = newPassword;
        
        // Удаляем использованный токен
        localStorage.removeItem(`scm_reset_token_${username}`);
        
        console.log(`Пароль для пользователя ${username} обновлен`);
        
        return {
            success: true,
            message: 'Пароль успешно изменен'
        };
    }
    
    // Регистрация нового пользователя
    registerUser(userData) {
        const { username, password, name, email, role } = userData;
        
        // Проверяем, не существует ли уже пользователь
        if (this.users[username]) {
            return {
                success: false,
                message: 'Пользователь с таким именем уже существует'
            };
        }
        
        // Проверяем email на уникальность
        const emailExists = Object.values(this.users).some(
            user => user.email === email
        );
        
        if (emailExists) {
            return {
                success: false,
                message: 'Пользователь с таким email уже существует'
            };
        }
        
        // Проверяем пароль
        const passwordValidation = this.validatePassword(password);
        if (!passwordValidation.valid) {
            return {
                success: false,
                message: passwordValidation.message
            };
        }
        
        // Определяем разрешения по роли
        const rolePermissions = {
            'superadmin': ['all'],
            'admin': ['manage_users', 'manage_courses', 'manage_content', 'view_analytics'],
            'teacher': ['manage_courses', 'grade_assignments', 'view_students', 'create_content'],
            'student': ['view_courses', 'submit_assignments', 'view_grades', 'participate_discussions']
        };
        
        // Создаем нового пользователя
        this.users[username] = {
            password: password,
            role: role,
            name: name,
            email: email,
            permissions: rolePermissions[role] || [],
            created: new Date().toISOString().split('T')[0],
            lastLogin: new Date().toISOString()
        };
        
        console.log(`Создан новый пользователь: ${name} (${role})`);
        
        return {
            success: true,
            message: `Пользователь ${name} успешно создан`,
            user: { username, name, email, role }
        };
    }
    
    // Получение списка всех пользователей (для админки)
    getAllUsers() {
        const currentUser = this.getCurrentUser();
        
        if (!currentUser || 
            (currentUser.role !== 'superadmin' && currentUser.role !== 'admin')) {
            return null;
        }
        
        return Object.keys(this.users).map(username => {
            const user = this.users[username];
            return {
                username: username,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
                created: user.created,
                lastLogin: user.lastLogin
            };
        });
    }
    
    // Изменение роли пользователя
    changeUserRole(username, newRole, currentUser) {
        if (!currentUser || currentUser.role !== 'superadmin') {
            return {
                success: false,
                message: 'Недостаточно прав для изменения роли'
            };
        }
        
        if (!this.users[username]) {
            return {
                success: false,
                message: 'Пользователь не найден'
            };
        }
        
        const rolePermissions = {
            'superadmin': ['all'],
            'admin': ['manage_users', 'manage_courses', 'manage_content', 'view_analytics'],
            'teacher': ['manage_courses', 'grade_assignments', 'view_students', 'create_content'],
            'student': ['view_courses', 'submit_assignments', 'view_grades', 'participate_discussions']
        };
        
        this.users[username].role = newRole;
        this.users[username].permissions = rolePermissions[newRole] || [];
        
        console.log(`Роль пользователя ${username} изменена на ${newRole}`);
        
        return {
            success: true,
            message: `Роль пользователя изменена на ${newRole}`
        };
    }
}

// Инициализация системы при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    window.authSystem = new AuthSystem();
    
    // Продление сессии при активности пользователя
    let activityTimer;
    
    function resetActivityTimer() {
        clearTimeout(activityTimer);
        activityTimer = setTimeout(() => {
            if (window.authSystem) {
                window.authSystem.refreshSession();
            }
        }, 5 * 60 * 1000); // Каждые 5 минут
    }
    
    // Следим за активностью пользователя
    ['click', 'mousemove', 'keypress', 'scroll'].forEach(event => {
        document.addEventListener(event, resetActivityTimer);
    });
    
    resetActivityTimer();
    
    // Защита от копирования сессии (базовая)
    window.addEventListener('storage', function(e) {
        if (e.key === 'scm_user' && !e.newValue) {
            // Если сессия была удалена в другой вкладке
            sessionStorage.removeItem('scm_user');
            alert('Сессия была завершена в другой вкладке.');
            window.location.href = 'login.html';
        }
    });
});

// Экспорт для использования в других скриптах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}
