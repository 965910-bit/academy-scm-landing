/**
 * Система авторизации и защиты ЛК SCM Академия
 * Добавьте этот скрипт в каждый ЛК для проверки доступа
 */

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, авторизован ли пользователь
    const userData = sessionStorage.getItem('scm_user');
    
    if (!userData) {
        // Пользователь не авторизован - редирект на страницу входа
        window.location.href = '../login.html';
        return;
    }
    
    // Парсим данные пользователя
    const user = JSON.parse(userData);
    
    // Проверяем, что сессия не истекла (максимум 24 часа)
    const hoursSinceLogin = (new Date().getTime() - user.timestamp) / (1000 * 60 * 60);
    if (hoursSinceLogin > 24) {
        sessionStorage.removeItem('scm_user');
        alert('Ваша сессия истекла. Пожалуйста, войдите снова.');
        window.location.href = '../login.html';
        return;
    }
    
    // Обновляем информацию о пользователе в интерфейсе
    updateUserInfo(user);
    
    // Настраиваем кнопку выхода
    setupLogoutButton();
    
    // Проверяем доступ к данной роли (если нужно)
    checkRoleAccess(user.role);
});

/**
 * Обновляет информацию о пользователе в интерфейсе
 */
function updateUserInfo(user) {
    // Обновляем имя пользователя
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        if (el.textContent.includes('Иван Иванов') || 
            el.textContent.includes('Анна Дмитриева') || 
            el.textContent.includes('Мария Сидорова')) {
            el.textContent = user.name;
        }
    });
    
    // Обновляем роль
    const roleElements = document.querySelectorAll('.user-role');
    roleElements.forEach(el => {
        if (el.textContent.includes('Супер-Администратор') || 
            el.textContent.includes('Администратор') || 
            el.textContent.includes('Преподаватель')) {
            
            const roleNames = {
                'superadmin': 'Супер-Администратор',
                'admin': 'Администратор',
                'teacher': 'Преподаватель',
                'student': 'Студент'
            };
            
            el.textContent = roleNames[user.role] || user.role;
        }
    });
    
    // Обновляем аватар с инициалами
    const avatarElements = document.querySelectorAll('.user-avatar');
    if (avatarElements.length > 0) {
        const initials = user.name.split(' ').map(n => n[0]).join('');
        avatarElements[0].textContent = initials;
    }
}

/**
 * Настраивает кнопку выхода из системы
 */
function setupLogoutButton() {
    const logoutButtons = document.querySelectorAll('.logout-btn');
    
    logoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (confirm('Вы уверены, что хотите выйти из системы?')) {
                // Очищаем данные сессии
                sessionStorage.removeItem('scm_user');
                
                // Перенаправляем на страницу входа
                window.location.href = '../login.html';
            }
        });
    });
}

/**
 * Проверяет доступ к роли (дополнительная проверка)
 */
function checkRoleAccess(currentRole) {
    // Получаем текущий путь
    const path = window.location.pathname;
    
    // Определяем, какая роль требуется для этого ЛК
    let requiredRole = '';
    
    if (path.includes('superadmin')) {
        requiredRole = 'superadmin';
    } else if (path.includes('admin')) {
        requiredRole = 'admin';
    } else if (path.includes('teacher')) {
        requiredRole = 'teacher';
    } else if (path.includes('student')) {
        requiredRole = 'student';
    }
    
    // Если определены роли и текущая роль не соответствует
    if (requiredRole && currentRole !== requiredRole) {
        alert('У вас нет доступа к этому разделу.');
        window.location.href = '../login.html';
    }
}

/**
 * Проверяет сессию при каждом действии (опционально)
 */
function checkSession() {
    const userData = sessionStorage.getItem('scm_user');
    
    if (!userData) {
        window.location.href = '../login.html';
        return false;
    }
    
    return true;
}

// Экспортируем функции для использования в других скриптах
window.authSystem = {
    checkSession,
    getUser: function() {
        const userData = sessionStorage.getItem('scm_user');
        return userData ? JSON.parse(userData) : null;
    },
    logout: function() {
        sessionStorage.removeItem('scm_user');
        window.location.href = '../login.html';
    }
};
