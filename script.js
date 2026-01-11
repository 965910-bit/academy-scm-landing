// Полный файл script.js для Академии Цепей Поставок
document.addEventListener('DOMContentLoaded', function() {
    
    // ==================== МОБИЛЬНОЕ МЕНЮ ====================
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.innerHTML = navLinks.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });
        
        // Закрытие меню при клике на ссылку
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
        
        // Закрытие меню при клике вне его
        document.addEventListener('click', (event) => {
            if (!navLinks.contains(event.target) && !menuToggle.contains(event.target) && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    }
    
    // ==================== ПЛАВНАЯ ПРОКРУТКА ====================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Рассчитываем позицию с учетом фиксированной навигации
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Обновляем URL без перезагрузки страницы
                history.pushState(null, null, targetId);
            }
        });
    });
    
    // ==================== ОБРАБОТКА ФОРМЫ ====================
    const leadForm = document.getElementById('leadForm');
    
    if (leadForm) {
        // Валидация номера телефона
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = this.value.replace(/\D/g, '');
                
                if (value.length > 0) {
                    if (value.length <= 3) {
                        value = '+7 (' + value;
                    } else if (value.length <= 6) {
                        value = '+7 (' + value.substring(1, 4) + ') ' + value.substring(4);
                    } else if (value.length <= 8) {
                        value = '+7 (' + value.substring(1, 4) + ') ' + value.substring(4, 7) + '-' + value.substring(7);
                    } else if (value.length <= 10) {
                        value = '+7 (' + value.substring(1, 4) + ') ' + value.substring(4, 7) + '-' + value.substring(7, 9) + '-' + value.substring(9);
                    }
                }
                
                this.value = value;
            });
        }
        
        // Отправка формы
        leadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Собираем данные формы
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                program: document.getElementById('program').value,
                message: document.getElementById('message').value.trim(),
                timestamp: new Date().toISOString(),
                source: 'Лендинг Академия Цепей Поставок',
                referrer: document.referrer || 'Прямой заход'
            };
            
            // Простая валидация
            if (!formData.name || !formData.email || !formData.program) {
                showNotification('Пожалуйста, заполните обязательные поля (имя, email, программа)', 'error');
                return;
            }
            
            if (!isValidEmail(formData.email)) {
                showNotification('Пожалуйста, введите корректный email адрес', 'error');
                return;
            }
            
            // Показываем индикатор загрузки
            const submitButton = leadForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
            submitButton.disabled = true;
            
            try {
                // В реальном проекте здесь будет отправка на сервер
                // Например: const response = await fetch('/api/leads', {method: 'POST', body: JSON.stringify(formData)});
                
                // Имитация отправки
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                console.log('Форма отправлена:', formData);
                
                // Показываем уведомление об успехе
                showNotification('Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в течение 24 часов.', 'success');
                
                // Отправка в Telegram (опционально)
                // await sendToTelegram(formData);
                
                // Сбрасываем форму
                leadForm.reset();
                
                // Отправка в Google Analytics (если подключен)
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'lead_submitted', {
                        'event_category': 'Form',
                        'event_label': formData.program
                    });
                }
                
            } catch (error) {
                console.error('Ошибка отправки формы:', error);
                showNotification('Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз или свяжитесь с нами другим способом.', 'error');
            } finally {
                // Восстанавливаем кнопку
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    }
    
    // ==================== ТАБЫ С КУРСАМИ ====================
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Удаляем активный класс у всех кнопок и контента
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Добавляем активный класс текущей кнопке и контенту
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Анимация появления
            const tabContent = document.getElementById(tabId);
            tabContent.style.opacity = '0';
            tabContent.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                tabContent.style.transition = 'opacity 0.3s, transform 0.3s';
                tabContent.style.opacity = '1';
                tabContent.style.transform = 'translateY(0)';
            }, 50);
        });
    });
    
    // ==================== АНИМАЦИЯ ПРИ ПРОКРУТКЕ ====================
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.program-card, .feature, .course-item');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.2;
            
            if (elementPosition < screenPosition) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };
    
    // Инициализация анимации
    const animatedElements = document.querySelectorAll('.program-card, .feature, .course-item');
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.5s, transform 0.5s';
    });
    
    // Запускаем при загрузке и при прокрутке
    animateOnScroll();
    window.addEventListener('scroll', animateOnScroll);
    
    // ==================== СЧЕТЧИКИ СТАТИСТИКИ ====================
    const statsSection = document.querySelector('.hero-stats');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(statsSection);
    }
    
    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        const duration = 2000; // 2 секунды
        
        counters.forEach(counter => {
            const target = parseInt(counter.textContent);
            const start = 0;
            const increment = target / (duration / 16); // 60fps
            
            let current = start;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = target;
                    clearInterval(timer);
                } else {
                    counter.textContent = Math.floor(current);
                }
            }, 16);
        });
    }
    
    // ==================== ТАЙМЕР АКЦИИ (если нужен) ====================
    function createOfferTimer() {
        const timerElement = document.createElement('div');
        timerElement.className = 'offer-timer';
        timerElement.innerHTML = `
            <div class="timer-content">
                <h4>Специальное предложение для первых 20 участников</h4>
                <div class="timer-digits">
                    <span id="days">00</span>:<span id="hours">00</span>:<span id="minutes">00</span>:<span id="seconds">00</span>
                </div>
                <p>Скидка 30% действует еще:</p>
            </div>
        `;
        
        // Добавляем таймер на страницу (например, перед формой)
        const contactSection = document.querySelector('.contact');
        if (contactSection) {
            contactSection.parentNode.insertBefore(timerElement, contactSection);
            
            // Запускаем таймер
            startTimer(3); // 3 дня для примера
        }
    }
    
    // Раскомментируйте, если нужен таймер
    // createOfferTimer();
    
    function startTimer(days) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
        
        function updateTimer() {
            const now = new Date().getTime();
            const distance = endDate - now;
            
            if (distance < 0) {
                clearInterval(timerInterval);
                document.querySelector('.offer-timer').style.display = 'none';
                return;
            }
            
            const daysLeft = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutesLeft = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const secondsLeft = Math.floor((distance % (1000 * 60)) / 1000);
            
            document.getElementById('days').textContent = daysLeft.toString().padStart(2, '0');
            document.getElementById('hours').textContent = hoursLeft.toString().padStart(2, '0');
            document.getElementById('minutes').textContent = minutesLeft.toString().padStart(2, '0');
            document.getElementById('seconds').textContent = secondsLeft.toString().padStart(2, '0');
        }
        
        updateTimer();
        const timerInterval = setInterval(updateTimer, 1000);
    }
    
    // ==================== ВАЛИДАЦИЯ EMAIL ====================
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // ==================== ПОКАЗ УВЕДОМЛЕНИЙ ====================
    function showNotification(message, type = 'info') {
        // Удаляем старое уведомление, если есть
        const oldNotification = document.querySelector('.notification');
        if (oldNotification) {
            oldNotification.remove();
        }
        
        // Создаем новое уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close"><i class="fas fa-times"></i></button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Закрытие по кнопке
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Автоматическое закрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // ==================== СТИЛИ ДЛЯ УВЕДОМЛЕНИЙ ====================
    const notificationStyles = document.createElement('style');
    notificationStyles.textContent = `
        .notification {
            position: fixed;
            top: 100px;
            right: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            padding: 20px;
            min-width: 300px;
            max-width: 400px;
            z-index: 9999;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .notification-success {
            border-left: 5px solid #10B981;
        }
        
        .notification-error {
            border-left: 5px solid #EF4444;
        }
        
        .notification-info {
            border-left: 5px solid #3B82F6;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .notification-content i {
            font-size: 1.5rem;
        }
        
        .notification-success .notification-content i {
            color: #10B981;
        }
        
        .notification-error .notification-content i {
            color: #EF4444;
        }
        
        .notification-info .notification-content i {
            color: #3B82F6;
        }
        
        .notification-content span {
            flex: 1;
            font-size: 0.95rem;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: #6B7280;
            cursor: pointer;
            font-size: 1rem;
            padding: 5px;
        }
        
        .notification-close:hover {
            color: #374151;
        }
        
        /* Таймер акции */
        .offer-timer {
            background: linear-gradient(135deg, #2563EB, #1D4ED8);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin: 40px auto;
            max-width: 600px;
            text-align: center;
        }
        
        .timer-content h4 {
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .timer-digits {
            font-family: monospace;
            font-size: 2.5rem;
            font-weight: bold;
            margin: 20px 0;
            letter-spacing: 5px;
        }
        
        @media (max-width: 768px) {
            .notification {
                left: 20px;
                right: 20px;
                max-width: none;
            }
            
            .timer-digits {
                font-size: 2rem;
            }
        }
    `;
    document.head.appendChild(notificationStyles);
    
    // ==================== ОТПРАВКА В TELEGRAM (опционально) ====================
    async function sendToTelegram(formData) {
        // Для работы нужен Telegram Bot Token и Chat ID
        const botToken = ''; // Ваш токен бота
        const chatId = ''; // Ваш chat ID
        
        if (!botToken || !chatId) return;
        
        const message = `
📝 Новая заявка с лендинга:
        
👤 Имя: ${formData.name}
📧 Email: ${formData.email}
📞 Телефон: ${formData.phone}
🎓 Программа: ${formData.program}
💬 Сообщение: ${formData.message || 'Не указано'}
⏰ Время: ${new Date().toLocaleString()}
        `.trim();
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            
            const result = await response.json();
            console.log('Сообщение отправлено в Telegram:', result);
        } catch (error) {
            console.error('Ошибка отправки в Telegram:', error);
        }
    }
    
    // ==================== ДОПОЛНИТЕЛЬНЫЕ ФИЧИ ====================
    
    // 1. Активное меню при прокрутке
    function highlightActiveMenu() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-links a');
        
        let currentSection = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            const navHeight = document.querySelector('.navbar').offsetHeight;
            
            if (scrollY >= (sectionTop - navHeight - 100)) {
                currentSection = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }
    
    // Запускаем при прокрутке
    window.addEventListener('scroll', highlightActiveMenu);
    
    // 2. Ленивая загрузка изображений
    function lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
    
    lazyLoadImages();
    
    // 3. Определение устройства
    function detectDevice() {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
        
        document.body.classList.add(isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop');
        
        // Можно использовать для аналитики
        console.log(`Устройство: ${isMobile ? 'Мобильное' : isTablet ? 'Планшет' : 'Десктоп'}`);
    }
    
    detectDevice();
    
    // 4. Время загрузки страницы
    window.addEventListener('load', () => {
        const loadTime = window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart;
        console.log(`Страница загрузилась за ${loadTime} мс`);
        
        // Можно отправить в аналитику
        if (typeof gtag !== 'undefined') {
            gtag('event', 'timing_complete', {
                'name': 'page_load',
                'value': loadTime,
                'event_category': 'Performance'
            });
        }
    });
    
    // 5. Кнопка "Наверх"
    function createBackToTopButton() {
        const button = document.createElement('button');
        button.id = 'backToTop';
        button.innerHTML = '<i class="fas fa-chevron-up"></i>';
        button.title = 'Наверх';
        document.body.appendChild(button);
        
        window.addEventListener('scroll', () => {
            button.style.opacity = window.scrollY > 500 ? '1' : '0';
            button.style.pointerEvents = window.scrollY > 500 ? 'auto' : 'none';
        });
        
        button.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        // Стили для кнопки
        const buttonStyles = document.createElement('style');
        buttonStyles.textContent = `
            #backToTop {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 50px;
                height: 50px;
                background-color: var(--primary);
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 1.2rem;
                cursor: pointer;
                box-shadow: 0 5px 15px rgba(37, 99, 235, 0.3);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s, transform 0.3s;
                z-index: 100;
            }
            
            #backToTop:hover {
                background-color: var(--primary-dark);
                transform: translateY(-3px);
            }
        `;
        document.head.appendChild(buttonStyles);
    }
    
    createBackToTopButton();
    
    // 6. Аналитика кликов
    document.addEventListener('click', (e) => {
        // Отслеживаем клики по кнопкам CTA
        if (e.target.closest('.btn-primary')) {
            console.log('Клик по CTA кнопке:', e.target.textContent);
            
            // Можно отправлять в Google Analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'cta_click', {
                    'event_category': 'Button',
                    'event_label': e.target.textContent.trim()
                });
            }
        }
    });
    
    // 7. Сохранение данных формы при закрытии/обновлении страницы
    if (leadForm) {
        // Сохраняем данные при вводе
        leadForm.addEventListener('input', (e) => {
            if (e.target.type !== 'submit') {
                const formData = {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    program: document.getElementById('program').value,
                    message: document.getElementById('message').value
                };
                localStorage.setItem('academyFormData', JSON.stringify(formData));
            }
        });
        
        // Восстанавливаем данные при загрузке
        const savedData = localStorage.getItem('academyFormData');
        if (savedData) {
            const formData = JSON.parse(savedData);
            Object.keys(formData).forEach(key => {
                const element = document.getElementById(key);
                if (element && formData[key]) {
                    element.value = formData[key];
                }
            });
            
            // Очищаем сохраненные данные после восстановления
            setTimeout(() => {
                localStorage.removeItem('academyFormData');
            }, 1000);
        }
    }
    
    // 8. Проверка поддержки WebP
    function checkWebPSupport() {
        const webP = new Image();
        webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        webP.onload = webP.onerror = function() {
            const isSupported = (webP.height === 2);
            document.body.classList.add(isSupported ? 'webp' : 'no-webp');
        };
    }
    
    checkWebPSupport();
    
    // 9. Инициализация при загрузке
    console.log('Лендинг Академии Цепей Поставок загружен успешно!');
    
    // Показать тестовое уведомление при загрузке (можно удалить)
    // setTimeout(() => {
    //     showNotification('Добро пожаловать! Выберите программу обучения', 'info');
    // }, 1000);
});

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================

// Функция для отправки данных в CRM (интеграция)
window.sendToCRM = function(formData) {
    // Пример интеграции с amoCRM
    const crmData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        lead_name: `Заявка с лендинга: ${formData.program}`,
        tags: ['Академия Цепей Поставок', 'Лендинг', formData.program],
        custom_fields: {
            program: formData.program,
            message: formData.message,
            source: 'Лендинг academyscm.ru'
        }
    };
    
    // Здесь будет вызов API вашего CRM
    console.log('Данные для CRM:', crmData);
    
    // Возвращаем промис для асинхронной обработки
    return Promise.resolve({ success: true, data: crmData });
};

// Функция для открытия модального окна
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Блокируем прокрутку страницы
    }
};

// Функция для закрытия модального окна
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Восстанавливаем прокрутку
    }
};

// Функция для копирования текста в буфер обмена
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Текст скопирован: ', text);
        // Можно показать уведомление
        // showNotification('Текст скопирован в буфер обмена', 'success');
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
    });
};

// Глобальная функция для показа/скрытия элементов
window.toggleElement = function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
};

// Добавляем обработчик для Escape для закрытия модальных окон
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Закрываем все модальные окна
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }
});

// Полифилл для старых браузеров
if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        let el = this;
        if (!document.documentElement.contains(el)) return null;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };
}

if (!Element.prototype.matches) {
    Element.prototype.matches = 
        Element.prototype.matchesSelector || 
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector || 
        Element.prototype.oMatchesSelector || 
        Element.prototype.webkitMatchesSelector ||
        function(s) {
            const matches = (this.document || this.ownerDocument).querySelectorAll(s);
            let i = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {}
            return i > -1;
        };
}
