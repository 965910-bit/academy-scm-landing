/**
 * Система авторизации SCM Академия
 * Защита доступа к личным кабинетам
 */

class AuthSystem {
    constructor() {
        this.users = {
            'superadmin': {
                password: 'SCM2024!',
                role: 'superadmin',
                name: 'Иван Иванов',
                email: 'superadmin@scm-academy.ru',
                permissions: ['all']
            },
            'admin': {
                password: 'AdminPass123',
                role: 'admin',
                name: 'Анна Дмитриева',
                email: 'admin@scm-academy.ru',
                permissions: ['manage_users', 'manage_courses', 'manage_content']
            },
            'teacher': {
                password: 'Teach2024#',
                role: 'teacher',
                name: 'Мария Сидорова',
                email: 'teacher@scm-academy.ru',
                permissions: ['manage_courses', 'grade_assignments', 'view_students']
            },
            'student': {
                password: 'Student2024$',
                role: 'student',
                name: 'Алексей Петров',
                email: 'student@scm-academy.ru',
                permissions: ['view_courses', 'submit_assignments', 'view_grades']
            }
        };
        
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 часа
        this.init();
    }
    
    init() {
        this.checkSession();
        this.setupLogoutButtons();
        this.updateUserInterface();
    }
    
    // Проверка текущей сессии
    checkSession() {
        const userData = sessionStorage.getItem('scm_user');
        
        if (!userData) {
            this.redirectToLogin();
            return false;
        }
        
        try {
            const user = JSON.parse(userData);
            
            // Проверка времени сессии
            const sessionAge = new Date().getTime() - user.timestamp;
            if (sessionAge > this.sessionTimeout) {
                sessionStorage.removeItem('scm_user');
                alert('Ваша сессия истекла. Пожалуйста, войдите снова.');
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
            // Для dashboard/index.html доступен всем авторизованным
            return true;
        }
        
        // Проверяем, есть ли у пользователя доступ
        return pageRoles[pageType]?.includes(userRole) || false;
    }
    
    // Обновление интерфейса пользователя
    updateUserInterface() {
        const userData = sessionStorage.getItem('scm_user');
        
        if (!userData) return;
        
        const user = JSON.parse(userData);
        
        // Обновляем имя пользователя
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = user.name;
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
        const logoutButtons = document.querySelectorAll('.logout-btn, [data-action="logout"]');
        
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
            sessionStorage.removeItem('scm_user');
            
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
            
            // Перенаправляем на страницу входа
            window.location.href = '../login.html';
        }
    }
    
    // Перенаправление на страницу входа
    redirectToLogin() {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = '../login.html';
        }
    }
    
    // Перенаправление на главную дашборда
    redirectToDashboard() {
        window.location.href = 'index.html';
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
            window.location.href = '../login.html';
        }
    });
});

// Экспорт для использования в других скриптах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}
