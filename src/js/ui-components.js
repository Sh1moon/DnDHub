class UI {
    constructor() {
        this.notificationTimeout = null;
    }

    showNotification(message, type = 'info') {
        // Удаляем предыдущее уведомление если есть
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
            if (this.notificationTimeout) {
                clearTimeout(this.notificationTimeout);
            }
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification__content">
                <div class="notification__icon">${this.getNotificationIcon(type)}</div>
                <div class="notification__text">
                    <div class="notification__title">${this.getNotificationTitle(type)}</div>
                    <div class="notification__message">${message}</div>
                </div>
                <button class="notification__close" type="button" aria-label="Закрыть">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Обработчик закрытия по крестику
        const closeBtn = notification.querySelector('.notification__close');
        if (closeBtn) {
            // Функция закрытия уведомления
            const closeNotification = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
                
                // Останавливаем таймер если есть
                if (this.notificationTimeout) {
                    clearTimeout(this.notificationTimeout);
                    this.notificationTimeout = null;
                }
                
                // Закрываем уведомление
                this.hideNotification(notification);
                return false;
            };
            
            // Используем прямое присваивание onclick для надежности
            closeBtn.onclick = closeNotification;
            
            // Также добавляем обработчик через addEventListener с capture phase для раннего срабатывания
            closeBtn.addEventListener('click', closeNotification, true);
            
            // Дополнительный обработчик для максимальной надежности
            closeBtn.addEventListener('click', closeNotification, false);
        }

        // Обработчик закрытия при клике на само уведомление
        notification.addEventListener('click', (e) => {
            // НЕ закрываем если клик был на кнопку закрытия (она уже обработана)
            const clickedCloseBtn = e.target.closest('.notification__close');
            if (clickedCloseBtn) {
                // Клик был на кнопке закрытия - не обрабатываем здесь
                return;
            }
            
            // Клик был на уведомлении, но не на кнопке закрытия - закрываем
            if (this.notificationTimeout) {
                clearTimeout(this.notificationTimeout);
                this.notificationTimeout = null;
            }
            this.hideNotification(notification);
        });

        // Анимация появления
        setTimeout(() => {
            notification.classList.add('active');
        }, 10);

        // Автоматическое скрытие
        this.notificationTimeout = setTimeout(() => {
            this.hideNotification(notification);
        }, 5000);
    }

    hideNotification(notification) {
        if (!notification) return;
        
        // Останавливаем таймер если есть
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
            this.notificationTimeout = null;
        }
        
        // Анимация закрытия - уходим за правый край экрана
        notification.classList.remove('active');
        const notificationWidth = notification.offsetWidth || 400;
        const screenWidth = window.innerWidth;
        notification.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        notification.style.transform = `translateX(${screenWidth + notificationWidth}px)`;
        notification.style.opacity = '0';
        notification.style.pointerEvents = 'none';
        
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.style.display = 'none';
                notification.remove();
            }
        }, 300);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    getNotificationTitle(type) {
        const titles = {
            success: 'Успешно',
            error: 'Ошибка',
            warning: 'Предупреждение',
            info: 'Информация'
        };
        return titles[type] || titles.info;
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    validateForm(formElement) {
        const errors = [];
        const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');

        inputs.forEach(input => {
            const errorDiv = input.parentElement.querySelector('.error-message');
            if (errorDiv) {
                errorDiv.classList.remove('active');
                errorDiv.textContent = '';
            }

            if (!input.value.trim()) {
                errors.push({
                    field: input.name || input.id,
                    message: `Поле "${input.previousElementSibling?.textContent || input.placeholder}" обязательно для заполнения`
                });
                if (errorDiv) {
                    errorDiv.textContent = 'Это поле обязательно для заполнения';
                    errorDiv.classList.add('active');
                }
            }

            // Email валидация
            if (input.type === 'email' && input.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    errors.push({
                        field: input.name || input.id,
                        message: 'Некорректный email адрес'
                    });
                    if (errorDiv) {
                        errorDiv.textContent = 'Некорректный email адрес';
                        errorDiv.classList.add('active');
                    }
                }
            }

            // Пароль валидация
            if (input.type === 'password' && input.value) {
                if (input.value.length < 6) {
                    errors.push({
                        field: input.name || input.id,
                        message: 'Пароль должен содержать минимум 6 символов'
                    });
                    if (errorDiv) {
                        errorDiv.textContent = 'Пароль должен содержать минимум 6 символов';
                        errorDiv.classList.add('active');
                    }
                }
            }
        });

        return errors;
    }

    setupFormValidation() {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                const errors = this.validateForm(form);
                if (errors.length > 0) {
                    e.preventDefault();
                    this.showNotification('Пожалуйста, исправьте ошибки в форме', 'error');
                }
            });

            // Валидация при потере фокуса
            form.querySelectorAll('input, select, textarea').forEach(input => {
                input.addEventListener('blur', () => {
                    this.validateForm(form);
                });
            });
        });
    }

    setupModals() {
        // Используем делегирование событий для динамически созданных модальных окон
        document.addEventListener('click', (e) => {
            // Пропускаем модальные окна админ панели - у них свои обработчики
            const adminModal = e.target.closest('.entity-edit-modal, .user-edit-modal');
            if (adminModal) {
                return;
            }
            
            // Также проверяем, если кнопка закрытия находится внутри модальных окон админ панели
            if (e.target.classList.contains('modal__close') || 
                e.target.classList.contains('close-modal') ||
                e.target.hasAttribute('data-admin-close') ||
                e.target.closest('[data-admin-close]')) {
                const parentModal = e.target.closest('.entity-edit-modal, .user-edit-modal');
                if (parentModal) {
                    return;
                }
            }

            // Закрытие по кнопке закрытия
            if (e.target.classList.contains('modal__close') || e.target.classList.contains('close-modal')) {
                e.preventDefault();
                e.stopPropagation();
                const modal = e.target.closest('.modal-overlay') || e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                    // Если модальное окно было создано динамически, удаляем его
                    setTimeout(() => {
                        if (modal.parentNode && modal.classList.contains('modal') && !modal.id) {
                            modal.remove();
                        }
                    }, 300);
                }
                return false;
            }

            // Закрытие при клике на overlay (но не на само модальное окно)
            if (e.target.classList.contains('modal-overlay') || (e.target.classList.contains('modal') && !e.target.querySelector('.modal__content'))) {
                // Пропускаем модальные окна админ панели
                if (!e.target.classList.contains('entity-edit-modal') && 
                    !e.target.classList.contains('user-edit-modal') &&
                    !e.target.closest('.entity-edit-modal') &&
                    !e.target.closest('.user-edit-modal')) {
                    e.target.classList.remove('active');
                }
            }
        }, true);

        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal-overlay.active, .modal.active');
                if (activeModal) {
                    activeModal.classList.remove('active');
                    setTimeout(() => {
                        if (activeModal.parentNode && activeModal.classList.contains('modal') && !activeModal.id) {
                            activeModal.remove();
                        }
                    }, 300);
                }
            }
        });
    }

    init() {
        this.setupFormValidation();
        this.setupModals();
    }
}

// Экспорт для глобального использования
window.UI = new UI();

