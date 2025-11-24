// Стилизованное модальное окно для подтверждения действий
class ConfirmModal {
    constructor() {
        this.modalOverlay = null;
        this.resolveCallback = null;
    }

    show(message, title = 'Подтверждение', confirmText = 'Да', cancelText = 'Отмена') {
        return new Promise((resolve) => {
            this.resolveCallback = resolve;

            // Удаляем предыдущее модальное окно если есть
            const existing = document.querySelector('.confirm-modal-overlay');
            if (existing) {
                existing.remove();
            }

            this.modalOverlay = document.createElement('div');
            this.modalOverlay.className = 'confirm-modal-overlay';
            this.modalOverlay.innerHTML = `
                <div class="confirm-modal">
                    <div class="confirm-modal__header">
                        <h2>${title}</h2>
                        <button class="confirm-modal__close" aria-label="Закрыть">&times;</button>
                    </div>
                    <div class="confirm-modal__body">
                        <p>${message}</p>
                    </div>
                    <div class="confirm-modal__footer">
                        <button class="btn btn-secondary confirm-cancel">${cancelText}</button>
                        <button class="btn btn-primary confirm-ok">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(this.modalOverlay);

            // Обработчики
            const closeBtn = this.modalOverlay.querySelector('.confirm-modal__close');
            const cancelBtn = this.modalOverlay.querySelector('.confirm-cancel');
            const okBtn = this.modalOverlay.querySelector('.confirm-ok');

            const close = (result) => {
                if (this.modalOverlay) {
                    this.modalOverlay.classList.remove('active');
                    setTimeout(() => {
                        if (this.modalOverlay && this.modalOverlay.parentNode) {
                            this.modalOverlay.remove();
                        }
                        this.modalOverlay = null;
                    }, 300);
                }
                if (this.resolveCallback) {
                    this.resolveCallback(result);
                    this.resolveCallback = null;
                }
            };

            if (closeBtn) {
                closeBtn.addEventListener('click', () => close(false));
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => close(false));
            }

            if (okBtn) {
                okBtn.addEventListener('click', () => close(true));
            }

            // Закрытие по клику на overlay
            this.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.modalOverlay) {
                    close(false);
                }
            });

            // Показываем модальное окно
            setTimeout(() => {
                if (this.modalOverlay) {
                    this.modalOverlay.classList.add('active');
                }
            }, 10);
        });
    }
}

// Глобальный экземпляр
window.ConfirmModal = new ConfirmModal();

// Функция-замена для confirm
window.confirmModal = function(message, title, confirmText, cancelText) {
    return window.ConfirmModal.show(message, title, confirmText, cancelText);
};

