// ========== АКАДЕМИЯ ЦЕПЕЙ ПОСТАВОК - ОСНОВНОЙ СКРИПТ ==========
document.addEventListener('DOMContentLoaded', function() {
    
    // ========== ПРЕЛОАДЕР ==========
    const preloader = document.getElementById('preloader');
    if (preloader) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                preloader.classList.add('hidden');
                setTimeout(() => {
                    preloader.style.display = 'none';
                }, 500);
            }, 500);
        });
    }
    
    // ========== МОБИЛЬНОЕ МЕНЮ ==========
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.className = navLinks.classList.contains('active') 
                    ? 'fas fa-times' 
                    : 'fas fa-bars';
            }
        });
        
        // Закрытие меню при клике на ссылку
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            });
        });
        
        // Закрытие меню при клике вне его
        document.addEventListener('click', (event) => {
            if (!navLinks.contains(event.target) && 
                !menuToggle.contains(event.target) && 
                navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            }
        });
    }
    
    // ========== ПЛАВНАЯ ПРОКРУТКА ==========
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Пропускаем якорь "#" и кнопки с data-tab
            if (href === '#' || this.hasAttribute('data-tab')) return;
            
            e.preventDefault();
            
            const targetId = href;
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
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
    
    // ========== ТАБЫ С КУРСАМИ ==========
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
            const targetTab = document.getElementById(tabId + '-tab');
            if (targetTab) {
                targetTab.classList.add('active');
                
                // Анимация появления
                targetTab.style.opacity = '0';
                targetTab.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    targetTab.style.transition = 'opacity 0.3s, transform 0.3s';
                    targetTab.style.opacity = '1';
                    targetTab.style.transform = 'translateY(0)';
                }, 50);
            }
        });
    });
    
    // ========== ФОРМА ОБРАТНОЙ СВЯЗИ ==========
    const leadForm = document.getElementById('leadForm');
    
    if (leadForm) {
        // Маска для телефона
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = this.value.replace(/\D/g, '');
                
                if (value.length > 0) {
                    if (value.length <= 1) {
                        value = '+7 (' + value;
                    } else if (value.length <= 4) {
                        value = '+7 (' + value.substring(1, 4);
                    } else if (value.length <= 7) {
                        value = '+7 (' + value.substring(1, 4) + ') ' + value.substring(4);
                    } else if (value.length <= 9) {
                        value = '+7 (' + value.substring(1, 4) + ') ' + value.substring(4, 7) + '-' + value.substring(7);
                    } else if (value.length <= 11) {
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
                name: document.getElementById('name')?.value.trim() || '',
                email: document.getElementById('email')?.value.trim() || '',
                phone: document.getElementById('phone')?.value.trim() || '',
                program: document.getElementById('program')?.value || '',
                message: document.getElementById('message')?.value.trim() || '',
                timestamp: new Date().toISOString(),
                source: 'Лендинг Академия Цепей Поставок',
                referrer: document.referrer || 'Прямой заход'
            };
            
            // Валидация
            if (!formData.name || !formData.email || !formData.program) {
                showNotification('Пожалуйста, заполните обязательные поля (имя, email, программа)', 'error');
                return;
            }
            
            if (!isValidEmail(formData.email)) {
                showNotification('Пожалуйста, введите корректный email адрес', 'error');
                return;
            }
            
            if (!document.getElementById('agreement').checked) {
                showNotification('Необходимо согласие на обработку персональных данных', 'error');
                return;
            }
            
            // Показываем индикатор загрузки
            const submitButton = leadForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
            submitButton.disabled = true;
            
            try {
                // Имитация отправки на сервер
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                console.log('Форма отправлена:', formData);
                
                // Показываем уведомление об успехе
                showNotification('Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в течение 24 часов.', 'success');
                
                // Можно добавить отправку в Google Analytics
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'lead_submitted', {
                        'event_category': 'Form',
                        'event_label': formData.program,
                        'value': 1
                    });
                }
                
                // Сбрасываем форму
                leadForm.reset();
                
            } catch (error) {
                console.error('Ошибка отправки формы:', error);
                showNotification('Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз или свяжитесь с нами другим способом.', 'error');
            } finally {
                // Восстанавливаем кнопку
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }
        });
    }
    
    // ========== АНИМАЦИЯ СТАТИСТИКИ ==========
    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number[data-count]');
        
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-count'));
            const duration = 2000; // 2 секунды
            const step = target / (duration / 16); // 60fps
            
            let current = 0;
            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    counter.textContent = target;
                    clearInterval(timer);
                } else {
                    counter.textContent = Math.floor(current);
                }
            }, 16);
        });
    }
    
    // Запускаем анимацию при появлении блока статистики
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    const statsSection = document.querySelector('.hero-stats');
    if (statsSection) {
        observer.observe(statsSection);
    }
    
    // ========== АНИМАЦИЯ ЭЛЕМЕНТОВ ПРИ ПРОКРУТКЕ ==========
    function animateOnScroll() {
        const elements = document.querySelectorAll('.program-card, .course-item, .feature, .community-feature');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight * 0.8;
            
            if (elementPosition < screenPosition) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    }
    
    // Инициализация анимации
    const animatedElements = document.querySelectorAll('.program-card, .course-item, .feature, .community-feature');
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    // Запускаем при загрузке и при прокрутке
    animateOnScroll();
    window.addEventListener('scroll', animateOnScroll);
    
    // ========== КНОПКА "НАВЕРХ" ==========
    const backToTop = document.getElementById('backToTop');
    
    if (backToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });
        
        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // ========== АКТИВНОЕ МЕНЮ ПРИ ПРОКРУТКЕ ==========
    function highlightActiveMenu() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        let currentSection = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            const navHeight = document.querySelector('.navbar').offsetHeight;
            
            if (window.scrollY >= (sectionTop - navHeight - 100)) {
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
    
    window.addEventListener('scroll', highlightActiveMenu);
    
    // ========== ФИКСИРОВАННАЯ НАВИГАЦИЯ ==========
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });
    
    // ========== УТИЛИТЫ ==========
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationMessage = notification.querySelector('.notification-message');
        const notificationIcon = notification.querySelector('i');
        
        if (notification && notificationMessage && notificationIcon) {
            // Устанавливаем сообщение и иконку
            notificationMessage.textContent = message;
            
            if (type === 'success') {
                notificationIcon.className = 'fas fa-check-circle';
                notificationIcon.style.color = '#10B981';
            } else if (type === 'error') {
                notificationIcon.className = 'fas fa-exclamation-circle';
                notificationIcon.style.color = '#EF4444';
            } else {
                notificationIcon.className = 'fas fa-info-circle';
                notificationIcon.style.color = '#3B82F6';
            }
            
            // Показываем уведомление
            notification.style.display = 'block';
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            // Закрытие по кнопке
            const closeButton = notification.querySelector('.notification-close');
            if (closeButton) {
                closeButton.onclick = () => {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        notification.style.display = 'none';
                    }, 300);
                };
            }
            
            // Автоматическое закрытие через 5 секунд
            setTimeout(() => {
                if (notification.classList.contains('show')) {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        notification.style.display = 'none';
                    }, 300);
                }
            }, 5000);
        } else {
            // Fallback на alert
            alert(message);
        }
    }
    
    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    console.log('Лендинг Академии Цепей Поставок загружен успешно!');
    
    // Показываем информацию о загрузке
    const loadTime = window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart;
    console.log(`Время загрузки: ${loadTime} мс`);
});

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ==========
// Для возможного расширения функционала
window.academy = {
    showNotification: function(message, type) {
        // Можно вызвать из консоли: academy.showNotification('Тест', 'success')
        const notification = document.getElementById('notification');
        if (notification) {
            // Реализация аналогична showNotification выше
            console.log('Показать уведомление:', message, type);
        }
    },
    
    scrollToSection: function(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const navHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = section.getBoundingClientRect().top + window.pageYOffset - navHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }
};
