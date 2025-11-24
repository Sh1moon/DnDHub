// Глобальный обработчик для закрытия всех модальных окон
(function() {
    'use strict';
    
    let isInitialized = false;
    
    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
            // Принудительно устанавливаем display: none через inline стиль с !important
            modal.style.setProperty('display', 'none', 'important');
            // Удаляем динамически созданные модальные окна (не статические, как authModal)
            if ((modal.classList.contains('modal-overlay') || 
                 modal.classList.contains('entity-modal-overlay')) && 
                modal.id !== 'authModal' && 
                modal.parentNode) {
                setTimeout(() => {
                    if (modal.parentNode && !modal.classList.contains('active')) {
                        modal.remove();
                    }
                }, 300);
            }
        }
    }
    
    function closeAllModals() {
        document.querySelectorAll('.modal-overlay.active, .auth-modal-overlay.active, .entity-modal-overlay.active, .modal.active').forEach(modal => {
            closeModal(modal);
        });
    }
    
    function initModalHandlers() {
        if (isInitialized) return;
        isInitialized = true;
        
        // Делегирование событий для всех модальных окон
        document.addEventListener('click', function(e) {
            // Пропускаем модальные окна админ панели - у них свои обработчики
            const adminModal = e.target.closest('.entity-edit-modal, .user-edit-modal');
            if (adminModal) {
                return;
            }
            
            // Также проверяем, если кнопка закрытия находится внутри модальных окон админ панели
            if (e.target.classList.contains('modal__close') || 
                e.target.classList.contains('close-modal') ||
                e.target.classList.contains('entity-modal__close') ||
                e.target.hasAttribute('data-admin-close') ||
                e.target.closest('[data-admin-close]')) {
                const parentModal = e.target.closest('.entity-edit-modal, .user-edit-modal');
                if (parentModal) {
                    return;
                }
            }

            // Закрытие по кнопке закрытия - проверяем ID и классы
            if (e.target.id === 'closeModal' || 
                e.target.id === 'closeAuthModal' ||
                e.target.classList.contains('close-modal') || 
                e.target.classList.contains('modal__close') ||
                e.target.classList.contains('auth-modal__close') ||
                e.target.classList.contains('entity-modal__close') ||
                (e.target.tagName === 'BUTTON' && e.target.textContent.trim() === '×')) {
                e.preventDefault();
                e.stopPropagation();
                
                // Ищем родительский modal-overlay
                let modal = e.target.closest('.modal-overlay') || 
                           e.target.closest('.auth-modal-overlay') ||
                           e.target.closest('.entity-modal-overlay');
                
                // Если не нашли, но это кнопка closeAuthModal, ищем authModal напрямую
                if (!modal && (e.target.id === 'closeModal' || e.target.id === 'closeAuthModal')) {
                    modal = document.getElementById('authModal');
                }
                
                // Если все еще не нашли, ищем через closest от родителя
                if (!modal) {
                    const btn = e.target.closest('.close-modal') || 
                               e.target.closest('.modal__close') ||
                               e.target.closest('.auth-modal__close') ||
                               e.target.closest('.entity-modal__close');
                    if (btn) {
                        modal = btn.closest('.modal-overlay') ||
                               btn.closest('.auth-modal-overlay') ||
                               btn.closest('.entity-modal-overlay');
                    }
                }
                
                if (modal) {
                    closeModal(modal);
                } else {
                    closeAllModals();
                }
                return false;
            }
            
            // Закрытие по клику на overlay (но не на содержимое модального окна)
            if (e.target.classList.contains('modal-overlay') ||
                e.target.classList.contains('auth-modal-overlay') ||
                e.target.classList.contains('entity-modal-overlay')) {
                // Проверяем, что клик был именно на overlay, а не на содержимое
                const clickedContent = e.target.querySelector('.modal') ||
                                     e.target.querySelector('.auth-modal') ||
                                     e.target.querySelector('.entity-modal');
                if (!clickedContent || !clickedContent.contains(e.target)) {
                    closeModal(e.target);
                }
            }
        }, true);
        
        // Закрытие по Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });
        
        // Предотвращаем закрытие при клике на содержимое модального окна
        // НО не блокируем клики внутри модальных окон кампании (campaign-tab-modal)
        document.addEventListener('click', function(e) {
            // Пропускаем клики внутри модальных окон кампании
            const campaignModal = e.target.closest('.campaign-tab-modal');
            if (campaignModal) {
                return; // Не блокируем события внутри модальных окон кампании
            }
            
            const modalContent = e.target.closest('.modal__content') || 
                               (e.target.closest('.modal') && !e.target.closest('.modal-overlay'));
            if (modalContent) {
                e.stopPropagation();
            }
        }, true);
    }
    
    // Инициализация при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModalHandlers);
    } else {
        initModalHandlers();
    }
})();