class AdminPanel {
    constructor(database, auth) {
        this.db = database;
        this.auth = auth;
        this.currentTab = 'users';
        this.currentEntityType = null;
        this.editingEntity = null;
        this.isModalOpening = false;
    }

    init() {
        if (!this.auth.isAdmin()) {
            window.location.hash = '#home';
            if (window.UI) {
                window.UI.showNotification('Доступ запрещен', 'error');
            }
            return;
        }

        this.render();
        this.setupEventListeners();
        this.setupAdminModalHandlers();
    }

    setupAdminModalHandlers() {
        // Глобальный обработчик для кнопок закрытия модальных окон админ панели
        document.addEventListener('click', (e) => {
            // Проверяем, что клик был на кнопке закрытия с атрибутом data-admin-close
            if (e.target.hasAttribute('data-admin-close') || 
                (e.target.classList.contains('modal__close') && e.target.closest('.entity-edit-modal, .user-edit-modal'))) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                const modalOverlay = e.target.closest('.entity-edit-modal, .user-edit-modal');
                if (modalOverlay && modalOverlay.parentNode && modalOverlay.dataset.closing !== 'true') {
                    modalOverlay.dataset.closing = 'true';
                    modalOverlay.classList.remove('active');
                    modalOverlay.style.setProperty('display', 'none', 'important');
                    setTimeout(() => {
                        if (modalOverlay && modalOverlay.parentNode) {
                            modalOverlay.remove();
                        }
                    }, 0);
                }
                return false;
            }
        }, true);
    }

    setupEventListeners() {
        // Переключение вкладок
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.currentTab = e.target.dataset.tab;
                this.render();
            });
        });

        // Переключение типа сущностей (используем делегирование, так как кнопки создаются динамически)
        document.addEventListener('click', (e) => {
            if (e.target.dataset.entityTypeKey) {
                this.currentEntityType = e.target.dataset.entityTypeKey;
                this.render();
            }
        });

        // Обработчики для кнопок действий
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete')) {
                const entityId = e.target.dataset.userId || 
                               e.target.dataset.characterId || 
                               e.target.dataset.roomId ||
                               e.target.dataset.entityId;
                const entityType = e.target.dataset.entityType;
                if (entityId && entityType) {
                    this.deleteEntity(entityType, parseInt(entityId));
                } else if (e.target.dataset.userId) {
                    this.deleteUser(parseInt(e.target.dataset.userId));
                } else if (e.target.dataset.characterId) {
                    this.deleteCharacter(parseInt(e.target.dataset.characterId));
                } else if (e.target.dataset.roomId) {
                    this.deleteRoom(parseInt(e.target.dataset.roomId));
                }
            }

            if (e.target.classList.contains('btn-edit')) {
                const entityId = e.target.dataset.userId || 
                               e.target.dataset.characterId || 
                               e.target.dataset.entityId;
                const entityType = e.target.dataset.entityType;
                if (entityId && entityType) {
                    this.editEntity(entityType, parseInt(entityId));
                } else if (e.target.dataset.userId) {
                    this.editUser(parseInt(e.target.dataset.userId));
                } else if (e.target.dataset.characterId) {
                    this.editCharacter(parseInt(e.target.dataset.characterId));
                }
            }

            if (e.target.classList.contains('btn-add-entity')) {
                const entityType = e.target.dataset.entityType;
                if (entityType) {
                    this.showAddEntityModal(entityType);
                }
            }
        });

        // Экспорт/импорт данных
        const exportBtn = document.getElementById('exportData');
        const exportDBJsonBtn = document.getElementById('exportDBJson');
        const importBtn = document.getElementById('importData');
        const resetBtn = document.getElementById('resetData');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        if (exportDBJsonBtn) {
            exportDBJsonBtn.addEventListener('click', () => this.exportDBJson());
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => this.importData());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetData());
        }
    }

    render() {
        const container = document.getElementById('adminPanel');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-panel">
                <div class="admin-panel__header">
                    <h2>Админ панель</h2>
                </div>
                <div class="admin-panel__tabs">
                    <div class="tab admin-tab ${this.currentTab === 'users' ? 'active' : ''}" 
                         data-tab="users">Пользователи</div>
                    <div class="tab admin-tab ${this.currentTab === 'characters' ? 'active' : ''}" 
                         data-tab="characters">Персонажи</div>
                    <div class="tab admin-tab ${this.currentTab === 'rooms' ? 'active' : ''}" 
                         data-tab="rooms">Комнаты</div>
                    <div class="tab admin-tab ${this.currentTab === 'entities' ? 'active' : ''}" 
                         data-tab="entities">Сущности БД</div>
                    <div class="tab admin-tab ${this.currentTab === 'data' ? 'active' : ''}" 
                         data-tab="data">Данные</div>
                </div>
                <div class="admin-panel__content">
                    ${this.renderTabContent()}
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    renderTabContent() {
        switch (this.currentTab) {
            case 'users':
                return this.renderUsers();
            case 'characters':
                return this.renderCharacters();
            case 'rooms':
                return this.renderRooms();
            case 'entities':
                return this.renderEntities();
            case 'data':
                return this.renderData();
            default:
                return '';
        }
    }

    renderUsers() {
        const users = this.db.getData('users') || [];
        return `
            <div class="admin-section">
                <div class="admin-section__header">
                    <h3>Пользователи (${users.length})</h3>
                    <button class="btn btn-primary btn-add-entity" data-entity-type="user">Добавить пользователя</button>
                </div>
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Имя</th>
                                <th>Email</th>
                                <th>Роль</th>
                                <th>Дата регистрации</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>${user.id}</td>
                                    <td>${user.name}</td>
                                    <td>${user.email}</td>
                                    <td>${user.role}</td>
                                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td class="actions">
                                        <button class="btn btn-secondary btn-edit" data-user-id="${user.id}">Изменить</button>
                                        <button class="btn btn-danger btn-delete" data-user-id="${user.id}">Удалить</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderCharacters() {
        const characters = this.db.getCharacters();
        return `
            <div class="admin-section">
                <div class="admin-section__header">
                    <h3>Персонажи (${characters.length})</h3>
                </div>
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Имя</th>
                                <th>Раса</th>
                                <th>Класс</th>
                                <th>Уровень</th>
                                <th>Владелец</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${characters.map(char => {
                                const user = this.db.getUserById(char.userId);
                                return `
                                    <tr>
                                        <td>${char.id}</td>
                                        <td>${char.name}</td>
                                        <td>${char.race?.название || 'N/A'}</td>
                                        <td>${char.class?.название || 'N/A'}</td>
                                        <td>${char.level}</td>
                                        <td>${user?.name || 'N/A'}</td>
                                        <td class="actions">
                                            <button class="btn btn-secondary btn-edit" data-character-id="${char.id}">Изменить</button>
                                            <button class="btn btn-danger btn-delete" data-character-id="${char.id}">Удалить</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderRooms() {
        const rooms = this.db.getRooms();
        return `
            <div class="admin-section">
                <div class="admin-section__header">
                    <h3>Комнаты (${rooms.length})</h3>
                </div>
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Название</th>
                                <th>Код</th>
                                <th>Владелец</th>
                                <th>Участников</th>
                                <th>Тип</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rooms.map(room => {
                                const owner = this.db.getUserById(room.ownerId);
                                return `
                                    <tr>
                                        <td>${room.id}</td>
                                        <td>${room.name}</td>
                                        <td>${room.code}</td>
                                        <td>${owner?.name || 'N/A'}</td>
                                        <td>${room.participants?.length || 0}</td>
                                        <td>${room.isPublic ? 'Публичная' : 'Приватная'}</td>
                                        <td class="actions">
                                            <button class="btn btn-danger btn-delete" data-room-id="${room.id}">Удалить</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderEntities() {
        const entityTypes = [
            { key: 'расы', name: 'Расы', singular: 'race' },
            { key: 'классы', name: 'Классы', singular: 'class' },
            { key: 'заклинания', name: 'Заклинания', singular: 'spell' },
            { key: 'монстры', name: 'Монстры', singular: 'monster' },
            { key: 'предметы', name: 'Предметы', singular: 'item' }
        ];

        if (!this.currentEntityType) {
            this.currentEntityType = 'расы';
        }

        const entities = this.db.getData(this.currentEntityType) || [];
        const currentTypeInfo = entityTypes.find(t => t.key === this.currentEntityType);

        return `
            <div class="admin-section">
                <div class="admin-section__header">
                    <h3>Управление сущностями</h3>
                    <div class="entity-type-selector">
                        ${entityTypes.map(type => `
                            <button class="btn ${this.currentEntityType === type.key ? 'btn-primary' : 'btn-secondary'}" 
                                    data-entity-type-key="${type.key}">
                                ${type.name}
                            </button>
                        `).join('')}
                    </div>
                    <button class="btn btn-primary btn-add-entity" data-entity-type="${currentTypeInfo.singular}">
                        Добавить ${currentTypeInfo.name.toLowerCase().slice(0, -1)}у
                    </button>
                </div>
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Название</th>
                                <th>Изображение</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${entities.map(entity => `
                                <tr>
                                    <td>${entity.id}</td>
                                    <td>${entity.название || entity.name || 'N/A'}</td>
                                    <td>
                                        ${entity.фото ? `
                                            <img src="${entity.фото}" alt="${entity.название}" 
                                                 style="max-width: 50px; max-height: 50px; object-fit: contain; border-radius: 4px;">
                                        ` : '<span>Нет</span>'}
                                    </td>
                                    <td class="actions">
                                        <button class="btn btn-secondary btn-edit" 
                                                data-entity-id="${entity.id}" 
                                                data-entity-type="${currentTypeInfo.singular}">
                                            Изменить
                                        </button>
                                        <button class="btn btn-danger btn-delete" 
                                                data-entity-id="${entity.id}" 
                                                data-entity-type="${currentTypeInfo.singular}">
                                            Удалить
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderData() {
        const data = this.db.getData();
        const stats = {
            users: (data.users || []).length,
            characters: (data.characters || []).length,
            rooms: (data.rooms || []).length,
            races: (data.расы || []).length,
            classes: (data.классы || []).length,
            spells: (data.заклинания || []).length,
            monsters: (data.монстры || []).length,
            items: (data.предметы || []).length
        };

        return `
            <div class="admin-section">
                <h3>Статистика базы данных</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.users}</div>
                        <div class="stat-label">Пользователей</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.characters}</div>
                        <div class="stat-label">Персонажей</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.rooms}</div>
                        <div class="stat-label">Комнат</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.races}</div>
                        <div class="stat-label">Рас</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.classes}</div>
                        <div class="stat-label">Классов</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.spells}</div>
                        <div class="stat-label">Заклинаний</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.monsters}</div>
                        <div class="stat-label">Монстров</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.items}</div>
                        <div class="stat-label">Предметов</div>
                    </div>
                </div>
                <div class="data-actions">
                    <button class="btn btn-primary" id="exportData">Экспорт всех данных</button>
                    <button class="btn btn-primary" id="exportDBJson">Экспорт DB.json</button>
                    <button class="btn btn-secondary" id="importData">Импорт данных</button>
                    <button class="btn btn-danger" id="resetData">Сброс данных</button>
                </div>
            </div>
        `;
    }

    showAddEntityModal(entityType) {
        // Предотвращаем множественные вызовы
        if (this.isModalOpening) {
            return;
        }
        this.isModalOpening = true;
        
        // Закрываем все существующие модальные окна
        const existingModals = document.querySelectorAll('.entity-edit-modal');
        existingModals.forEach(modal => {
            if (modal.parentNode) {
                modal.remove();
            }
        });
        
        this.editingEntity = null;
        this.showEntityModal(entityType, null);
        
        // Сбрасываем флаг после небольшой задержки
        setTimeout(() => {
            this.isModalOpening = false;
        }, 100);
    }

    editEntity(entityType, entityId) {
        // Предотвращаем множественные вызовы
        if (this.isModalOpening) {
            return;
        }
        this.isModalOpening = true;
        
        // Закрываем все существующие модальные окна
        const existingModals = document.querySelectorAll('.entity-edit-modal');
        existingModals.forEach(modal => {
            if (modal.parentNode) {
                modal.remove();
            }
        });
        
        const typeMap = {
            'race': 'расы',
            'class': 'классы',
            'spell': 'заклинания',
            'monster': 'монстры',
            'item': 'предметы'
        };
        const dbKey = typeMap[entityType];
        let entities = this.db.getData(dbKey);
        if (!Array.isArray(entities)) {
            entities = [];
        }
        const entity = entities.find(e => e.id === entityId);
        
        if (entity) {
            this.editingEntity = entity;
            this.showEntityModal(entityType, entity);
        }
        
        // Сбрасываем флаг после небольшой задержки
        setTimeout(() => {
            this.isModalOpening = false;
        }, 100);
    }

    showEntityModal(entityType, entity) {
        // Закрываем все существующие модальные окна админ панели перед созданием нового
        const existingModals = document.querySelectorAll('.entity-edit-modal');
        existingModals.forEach(modal => {
            if (modal && modal.parentNode) {
                modal.classList.remove('active');
                modal.style.setProperty('display', 'none', 'important');
                modal.remove();
            }
        });
        
        const isEdit = !!entity;
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay entity-edit-modal';
        modalOverlay.innerHTML = `
            <div class="modal">
                <div class="modal__content">
                    <button class="modal__close">&times;</button>
                    <h2>${isEdit ? 'Редактировать' : 'Добавить'} ${this.getEntityTypeName(entityType)}</h2>
                    <form id="entityForm" class="entity-form">
                        <div class="form-group">
                            <label class="form-label">Название</label>
                            <input type="text" id="entityName" class="form-input" required 
                                   value="${entity?.название || entity?.name || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Изображение (URL или Base64)</label>
                            <textarea id="entityPhoto" class="form-input form-textarea" 
                                      placeholder="Вставьте URL изображения или Base64 строку">${entity?.фото || entity?.photo || ''}</textarea>
                            <label for="imageFileInput" class="btn btn-secondary" id="uploadImageBtn" style="cursor: pointer; display: inline-block; margin-top: 0.5rem;">
                                Загрузить изображение
                            </label>
                            <input type="file" id="imageFileInput" accept="image/*" style="display: none;">
                            ${entity?.фото || entity?.photo ? `
                                <div class="image-preview">
                                    <img src="${entity.фото || entity.photo}" alt="Preview" style="max-width: 200px; max-height: 200px; margin-top: 1rem;">
                                </div>
                            ` : ''}
                        </div>
                        <div id="entityFields"></div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelEntityBtn">Отмена</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Сохранить' : 'Добавить'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        // Заполняем дополнительные поля в зависимости от типа
        this.fillEntityFields(entityType, entity, modalOverlay);

        // Обработчики - получаем элементы после добавления в DOM
        const cancelBtn = modalOverlay.querySelector('#cancelEntityBtn');
        const closeBtn = modalOverlay.querySelector('.modal__close');
        const form = modalOverlay.querySelector('#entityForm');
        const uploadBtn = modalOverlay.querySelector('#uploadImageBtn');
        const fileInput = modalOverlay.querySelector('#imageFileInput');

        // Функция закрытия
        const closeModal = () => {
            if (modalOverlay.dataset.closing === 'true') {
                return;
            }
            modalOverlay.dataset.closing = 'true';
            this.closeEntityModal(modalOverlay);
        };

        // Обработчик для кнопки закрытия - используем уникальный ID для идентификации
        if (closeBtn) {
            const closeBtnId = 'admin-close-' + Date.now();
            closeBtn.id = closeBtnId;
            closeBtn.setAttribute('data-admin-close', 'true');
            
            // Прямой обработчик
            const closeHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (modalOverlay && modalOverlay.parentNode && modalOverlay.dataset.closing !== 'true') {
                    modalOverlay.dataset.closing = 'true';
                    modalOverlay.classList.remove('active');
                    modalOverlay.style.setProperty('display', 'none', 'important');
                    setTimeout(() => {
                        if (modalOverlay && modalOverlay.parentNode) {
                            modalOverlay.remove();
                        }
                    }, 0);
                }
                return false;
            };
            
            closeBtn.onclick = closeHandler;
            closeBtn.addEventListener('click', closeHandler, true);
        }

        // Обработчик для кнопки отмены
        if (cancelBtn) {
            cancelBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
                return false;
            };
        }

        // Обработчик загрузки изображения - используем label, который работает автоматически
        // НО добавляем обработчик change для файла
        if (fileInput) {
            const handleFileChange = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Файл выбран:', e.target.files);
                if (e.target.files && e.target.files.length > 0) {
                    this.handleImageUpload(e, modalOverlay);
                }
                // Сбрасываем значение после обработки, чтобы можно было загрузить тот же файл снова
                setTimeout(() => {
                    if (fileInput) {
                        fileInput.value = '';
                    }
                }, 100);
            };
            
            // Привязываем обработчик изменения файла
            fileInput.onchange = handleFileChange;
            fileInput.addEventListener('change', handleFileChange, false);
        } else {
            console.error('File input не найден!');
        }

        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.saveEntity(entityType, entity, modalOverlay);
            };
        }

        // Закрытие по клику на overlay
        modalOverlay.onclick = (e) => {
            // Пропускаем клики на кнопки закрытия, отмены И ЗАГРУЗКИ ИЗОБРАЖЕНИЯ
            if (e.target.classList.contains('modal__close') || 
                e.target.closest('.modal__close') ||
                e.target.id === 'cancelEntityBtn' ||
                e.target.closest('#cancelEntityBtn') ||
                e.target.id === 'uploadImageBtn' ||
                e.target.closest('#uploadImageBtn')) {
                return;
            }
            
            // Проверяем, что клик был именно на overlay, но не на содержимое
            const modalContent = modalOverlay.querySelector('.modal__content');
            const clickedOnContent = modalContent && modalContent.contains(e.target);
            
            if (!clickedOnContent && e.target === modalOverlay) {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            }
        };

        setTimeout(() => {
            // Проверяем, что модальное окно все еще в DOM перед показом
            if (modalOverlay && modalOverlay.parentNode) {
                modalOverlay.classList.add('active');
                modalOverlay.style.setProperty('display', 'flex', 'important');
            }
            // Сбрасываем флаг открытия
            this.isModalOpening = false;
        }, 10);
    }

    fillEntityFields(entityType, entity, modalOverlay) {
        const fieldsContainer = modalOverlay.querySelector('#entityFields');
        if (!fieldsContainer) return;

        let fieldsHTML = '';

        switch (entityType) {
            case 'spell':
                fieldsHTML = `
                    <div class="form-group">
                        <label class="form-label">Уровень</label>
                        <input type="number" id="entityLevel" class="form-input" min="0" max="9" 
                               value="${entity?.уровень || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Школа</label>
                        <input type="text" id="entitySchool" class="form-input" 
                               value="${entity?.школа || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Время накладывания</label>
                        <input type="text" id="entityCastingTime" class="form-input" 
                               value="${entity?.время_накладывания || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Дистанция</label>
                        <input type="text" id="entityRange" class="form-input" 
                               value="${entity?.дистанция || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Компоненты (через запятую)</label>
                        <input type="text" id="entityComponents" class="form-input" 
                               value="${Array.isArray(entity?.компоненты) ? entity.компоненты.join(', ') : (entity?.компоненты || '')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Длительность</label>
                        <input type="text" id="entityDuration" class="form-input" 
                               value="${entity?.длительность || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Описание</label>
                        <textarea id="entityDescription" class="form-input form-textarea" rows="4">${entity?.описание || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">На высших уровнях</label>
                        <textarea id="entityHigherLevels" class="form-input form-textarea" rows="2">${entity?.на_высших_уровнях || ''}</textarea>
                    </div>
                    <div class="form-group form-group-checkbox">
                        <label class="checkbox-label">
                            <input type="checkbox" id="entityRitual" class="checkbox-input" ${entity?.ритуал ? 'checked' : ''}>
                            <span class="checkbox-text">Ритуал</span>
                        </label>
                    </div>
                    <div class="form-group form-group-checkbox">
                        <label class="checkbox-label">
                            <input type="checkbox" id="entityConcentration" class="checkbox-input" ${entity?.концентрация ? 'checked' : ''}>
                            <span class="checkbox-text">Концентрация</span>
                        </label>
                    </div>
                `;
                break;
            case 'monster':
                fieldsHTML = `
                    <div class="form-group">
                        <label class="form-label">Размер</label>
                        <input type="text" id="entitySize" class="form-input" value="${entity?.размер || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Тип</label>
                        <input type="text" id="entityType" class="form-input" value="${entity?.тип || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Мировоззрение</label>
                        <input type="text" id="entityAlignment" class="form-input" value="${entity?.мировоззрение || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Класс доспеха</label>
                        <input type="number" id="entityAC" class="form-input" value="${entity?.класс_доспеха || 10}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Хиты</label>
                        <input type="text" id="entityHP" class="form-input" value="${entity?.хиты || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Скорость</label>
                        <input type="text" id="entitySpeed" class="form-input" value="${entity?.скорость || ''}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Сила</label>
                            <input type="number" id="entityStrength" class="form-input" value="${entity?.сила || 10}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ловкость</label>
                            <input type="number" id="entityDexterity" class="form-input" value="${entity?.ловкость || 10}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Телосложение</label>
                            <input type="number" id="entityConstitution" class="form-input" value="${entity?.телосложение || 10}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Интеллект</label>
                            <input type="number" id="entityIntelligence" class="form-input" value="${entity?.интеллект || 10}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Мудрость</label>
                            <input type="number" id="entityWisdom" class="form-input" value="${entity?.мудрость || 10}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Харизма</label>
                            <input type="number" id="entityCharisma" class="form-input" value="${entity?.харизма || 10}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Рейтинг сложности</label>
                        <input type="number" id="entityCR" class="form-input" step="0.25" value="${entity?.рейтинг_сложности || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Описание</label>
                        <textarea id="entityDescription" class="form-input form-textarea" rows="4">${entity?.описание || ''}</textarea>
                    </div>
                `;
                break;
            case 'item':
                fieldsHTML = `
                    <div class="form-group">
                        <label class="form-label">Тип</label>
                        <input type="text" id="entityItemType" class="form-input" value="${entity?.тип || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Редкость</label>
                        <input type="text" id="entityRarity" class="form-input" value="${entity?.редкость || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Стоимость</label>
                        <input type="text" id="entityCost" class="form-input" value="${entity?.стоимость || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Вес</label>
                        <input type="number" id="entityWeight" class="form-input" step="0.1" value="${entity?.вес || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Описание</label>
                        <textarea id="entityDescription" class="form-input form-textarea" rows="4">${entity?.описание || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Свойства (через запятую)</label>
                        <input type="text" id="entityProperties" class="form-input" 
                               value="${Array.isArray(entity?.свойства) ? entity.свойства.join(', ') : (entity?.свойства || '')}">
                    </div>
                    <div class="form-group form-group-checkbox">
                        <label class="checkbox-label">
                            <input type="checkbox" id="entityMagical" class="checkbox-input" ${entity?.магический ? 'checked' : ''}>
                            <span class="checkbox-text">Магический</span>
                        </label>
                    </div>
                `;
                break;
            case 'race':
                fieldsHTML = `
                    <div class="form-group">
                        <label class="form-label">Скорость</label>
                        <input type="number" id="entitySpeed" class="form-input" value="${entity?.скорость || 30}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Размер</label>
                        <input type="text" id="entitySize" class="form-input" value="${entity?.размер || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Описание</label>
                        <textarea id="entityDescription" class="form-input form-textarea" rows="4">${entity?.описание || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Бонус силы</label>
                            <input type="number" id="entityBonusStrength" class="form-input" value="${entity?.бонус_силы || 0}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Бонус ловкости</label>
                            <input type="number" id="entityBonusDexterity" class="form-input" value="${entity?.бонус_ловкости || 0}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Бонус телосложения</label>
                            <input type="number" id="entityBonusConstitution" class="form-input" value="${entity?.бонус_телосложения || 0}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Бонус интеллекта</label>
                            <input type="number" id="entityBonusIntelligence" class="form-input" value="${entity?.бонус_интеллекта || 0}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Бонус мудрости</label>
                            <input type="number" id="entityBonusWisdom" class="form-input" value="${entity?.бонус_мудрости || 0}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Бонус харизмы</label>
                            <input type="number" id="entityBonusCharisma" class="form-input" value="${entity?.бонус_харизмы || 0}">
                        </div>
                    </div>
                `;
                break;
            case 'class':
                fieldsHTML = `
                    <div class="form-group">
                        <label class="form-label">Хиты за уровень</label>
                        <input type="text" id="entityHPPerLevel" class="form-input" value="${entity?.хиты_за_уровень || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Описание</label>
                        <textarea id="entityDescription" class="form-input form-textarea" rows="4">${entity?.описание || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Владение доспехами (через запятую)</label>
                        <input type="text" id="entityArmorProficiencies" class="form-input" 
                               value="${Array.isArray(entity?.владение_доспехами) ? entity.владение_доспехами.join(', ') : (entity?.владение_доспехами || '')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Владение оружием (через запятую)</label>
                        <input type="text" id="entityWeaponProficiencies" class="form-input" 
                               value="${Array.isArray(entity?.владение_оружием) ? entity.владение_оружием.join(', ') : (entity?.владение_оружием || '')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Владение инструментами (через запятую)</label>
                        <input type="text" id="entityToolProficiencies" class="form-input" 
                               value="${Array.isArray(entity?.владение_инструментами) ? entity.владение_инструментами.join(', ') : (entity?.владение_инструментами || '')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Спасительные броски (через запятую)</label>
                        <input type="text" id="entitySavingThrows" class="form-input" 
                               value="${Array.isArray(entity?.спасительные_броски) ? entity.спасительные_броски.join(', ') : (entity?.спасительные_броски || '')}">
                    </div>
                `;
                break;
        }

        fieldsContainer.innerHTML = fieldsHTML;
    }

    handleImageUpload(event, modalOverlay) {
        const file = event.target.files[0];
        if (!file) return;

        // Проверяем тип файла
        if (!file.type.startsWith('image/')) {
            if (window.UI) {
                window.UI.showNotification('Пожалуйста, выберите изображение', 'error');
            }
            return;
        }

        // Проверяем размер файла (максимум 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            if (window.UI) {
                window.UI.showNotification('Размер файла не должен превышать 5MB', 'error');
            }
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => {
            if (window.UI) {
                window.UI.showNotification('Ошибка при чтении файла', 'error');
            }
        };
        
        reader.onload = (e) => {
            const base64 = e.target.result;
            const photoInput = modalOverlay.querySelector('#entityPhoto');
            if (photoInput) {
                photoInput.value = base64;
            }
            
            // Находим или создаем контейнер для превью
            let preview = modalOverlay.querySelector('.image-preview');
            const photoGroup = photoInput ? photoInput.closest('.form-group') : null;
            
            if (!preview) {
                preview = document.createElement('div');
                preview.className = 'image-preview';
                if (photoGroup) {
                    photoGroup.appendChild(preview);
                } else if (photoInput && photoInput.parentElement) {
                    photoInput.parentElement.appendChild(preview);
                }
            }
            
            // Обновляем превью
            preview.innerHTML = `
                <img src="${base64}" alt="Preview" 
                     style="max-width: 200px; max-height: 200px; margin-top: 1rem; border-radius: 8px; 
                            border: 2px solid var(--accent-color, #8B5CF6); 
                            object-fit: contain; 
                            background: var(--bg-dark, #1a1a2e);">
            `;
            
            if (window.UI) {
                window.UI.showNotification('Изображение загружено', 'success');
            }
        };
        
        reader.readAsDataURL(file);
    }

    saveEntity(entityType, oldEntity, modalOverlay) {
        const typeMap = {
            'race': 'расы',
            'class': 'классы',
            'spell': 'заклинания',
            'monster': 'монстры',
            'item': 'предметы'
        };
        const dbKey = typeMap[entityType];
        let entities = this.db.getData(dbKey);
        
        // Убеждаемся, что entities - это массив
        if (!Array.isArray(entities)) {
            entities = [];
        }

        const nameInput = modalOverlay.querySelector('#entityName');
        const photoInput = modalOverlay.querySelector('#entityPhoto');
        const name = nameInput.value.trim();

        if (!name) {
            if (window.UI) {
                window.UI.showNotification('Название обязательно', 'error');
            }
            return;
        }

        let entityData = {
            название: name,
            фото: photoInput.value.trim() || null
        };

        // Добавляем специфичные поля
        switch (entityType) {
            case 'spell':
                entityData.уровень = parseInt(modalOverlay.querySelector('#entityLevel')?.value || 0);
                entityData.школа = modalOverlay.querySelector('#entitySchool')?.value || '';
                entityData.время_накладывания = modalOverlay.querySelector('#entityCastingTime')?.value || '';
                entityData.дистанция = modalOverlay.querySelector('#entityRange')?.value || '';
                const componentsStr = modalOverlay.querySelector('#entityComponents')?.value || '';
                entityData.компоненты = componentsStr ? componentsStr.split(',').map(s => s.trim()).filter(s => s) : [];
                entityData.длительность = modalOverlay.querySelector('#entityDuration')?.value || '';
                entityData.описание = modalOverlay.querySelector('#entityDescription')?.value || '';
                entityData.на_высших_уровнях = modalOverlay.querySelector('#entityHigherLevels')?.value || null;
                entityData.ритуал = modalOverlay.querySelector('#entityRitual')?.checked || false;
                entityData.концентрация = modalOverlay.querySelector('#entityConcentration')?.checked || false;
                break;
            case 'monster':
                entityData.размер = modalOverlay.querySelector('#entitySize')?.value || '';
                entityData.тип = modalOverlay.querySelector('#entityType')?.value || '';
                entityData.мировоззрение = modalOverlay.querySelector('#entityAlignment')?.value || '';
                entityData.класс_доспеха = parseInt(modalOverlay.querySelector('#entityAC')?.value || 10);
                entityData.хиты = modalOverlay.querySelector('#entityHP')?.value || '';
                entityData.скорость = modalOverlay.querySelector('#entitySpeed')?.value || '';
                entityData.сила = parseInt(modalOverlay.querySelector('#entityStrength')?.value || 10);
                entityData.ловкость = parseInt(modalOverlay.querySelector('#entityDexterity')?.value || 10);
                entityData.телосложение = parseInt(modalOverlay.querySelector('#entityConstitution')?.value || 10);
                entityData.интеллект = parseInt(modalOverlay.querySelector('#entityIntelligence')?.value || 10);
                entityData.мудрость = parseInt(modalOverlay.querySelector('#entityWisdom')?.value || 10);
                entityData.харизма = parseInt(modalOverlay.querySelector('#entityCharisma')?.value || 10);
                entityData.рейтинг_сложности = parseFloat(modalOverlay.querySelector('#entityCR')?.value || 0);
                entityData.описание = modalOverlay.querySelector('#entityDescription')?.value || '';
                break;
            case 'item':
                entityData.тип = modalOverlay.querySelector('#entityItemType')?.value || '';
                entityData.редкость = modalOverlay.querySelector('#entityRarity')?.value || '';
                entityData.стоимость = modalOverlay.querySelector('#entityCost')?.value || '';
                entityData.вес = parseFloat(modalOverlay.querySelector('#entityWeight')?.value || 0);
                entityData.описание = modalOverlay.querySelector('#entityDescription')?.value || '';
                const propertiesStr = modalOverlay.querySelector('#entityProperties')?.value || '';
                entityData.свойства = propertiesStr ? propertiesStr.split(',').map(s => s.trim()).filter(s => s) : [];
                entityData.магический = modalOverlay.querySelector('#entityMagical')?.checked || false;
                break;
            case 'race':
                entityData.скорость = parseInt(modalOverlay.querySelector('#entitySpeed')?.value || 30);
                entityData.размер = modalOverlay.querySelector('#entitySize')?.value || '';
                entityData.описание = modalOverlay.querySelector('#entityDescription')?.value || '';
                entityData.бонус_силы = parseInt(modalOverlay.querySelector('#entityBonusStrength')?.value || 0);
                entityData.бонус_ловкости = parseInt(modalOverlay.querySelector('#entityBonusDexterity')?.value || 0);
                entityData.бонус_телосложения = parseInt(modalOverlay.querySelector('#entityBonusConstitution')?.value || 0);
                entityData.бонус_интеллекта = parseInt(modalOverlay.querySelector('#entityBonusIntelligence')?.value || 0);
                entityData.бонус_мудрости = parseInt(modalOverlay.querySelector('#entityBonusWisdom')?.value || 0);
                entityData.бонус_харизмы = parseInt(modalOverlay.querySelector('#entityBonusCharisma')?.value || 0);
                break;
            case 'class':
                entityData.хиты_за_уровень = modalOverlay.querySelector('#entityHPPerLevel')?.value || '';
                entityData.описание = modalOverlay.querySelector('#entityDescription')?.value || '';
                const armorStr = modalOverlay.querySelector('#entityArmorProficiencies')?.value || '';
                entityData.владение_доспехами = armorStr ? armorStr.split(',').map(s => s.trim()).filter(s => s) : [];
                const weaponStr = modalOverlay.querySelector('#entityWeaponProficiencies')?.value || '';
                entityData.владение_оружием = weaponStr ? weaponStr.split(',').map(s => s.trim()).filter(s => s) : [];
                const toolStr = modalOverlay.querySelector('#entityToolProficiencies')?.value || '';
                entityData.владение_инструментами = toolStr ? toolStr.split(',').map(s => s.trim()).filter(s => s) : [];
                const savingThrowsStr = modalOverlay.querySelector('#entitySavingThrows')?.value || '';
                entityData.спасительные_броски = savingThrowsStr ? savingThrowsStr.split(',').map(s => s.trim()).filter(s => s) : [];
                break;
        }

        if (oldEntity) {
            // Редактирование
            entityData.id = oldEntity.id;
            const index = entities.findIndex(e => e.id === oldEntity.id);
            if (index !== -1) {
                entities[index] = { ...entities[index], ...entityData };
            }
        } else {
            // Добавление
            let newId = 1;
            if (entities.length > 0) {
                const ids = entities.map(e => e && e.id ? parseInt(e.id) : 0).filter(id => !isNaN(id));
                if (ids.length > 0) {
                    newId = Math.max(...ids) + 1;
                }
            }
            entityData.id = newId;
            entities.push(entityData);
        }

        this.db.updateData(dbKey, entities);
        this.closeEntityModal(modalOverlay);
        this.render();
        
        if (window.UI) {
            window.UI.showNotification(
                oldEntity ? 'Сущность обновлена' : 'Сущность добавлена', 
                'success'
            );
        }
        
        // Предлагаем экспортировать обновленный DB.json
        this.offerExportDBJson();
    }

    offerExportDBJson() {
        // Показываем уведомление с предложением экспортировать DB.json
        if (window.UI) {
            // Создаем кастомное уведомление с кнопкой
            const notificationEl = document.createElement('div');
            notificationEl.className = 'notification notification-info';
            notificationEl.innerHTML = `
                <div class="notification__content" style="display: flex; align-items: center; gap: 10px;">
                    <div class="notification__icon">💾</div>
                    <div class="notification__text" style="flex: 1;">
                        <div class="notification__title">Экспорт DB.json</div>
                        <div class="notification__message">Хотите экспортировать обновленный DB.json?</div>
                    </div>
                    <button class="btn btn-primary" id="exportDBJsonBtn" style="padding: 5px 15px; font-size: 0.9rem; white-space: nowrap;">Экспортировать</button>
                    <button class="notification__close" type="button" aria-label="Закрыть">&times;</button>
                </div>
            `;
            document.body.appendChild(notificationEl);
            
            setTimeout(() => {
                notificationEl.classList.add('active');
            }, 10);
            
            const exportBtn = notificationEl.querySelector('#exportDBJsonBtn');
            const closeBtn = notificationEl.querySelector('.notification__close');
            
            if (exportBtn) {
                exportBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.exportDBJson();
                    if (notificationEl && notificationEl.parentNode) {
                        notificationEl.remove();
                    }
                };
            }
            
            if (closeBtn) {
                closeBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (notificationEl && notificationEl.parentNode) {
                        notificationEl.remove();
                    }
                };
            }
            
            // Автоматическое закрытие через 15 секунд
            setTimeout(() => {
                if (notificationEl && notificationEl.parentNode) {
                    notificationEl.remove();
                }
            }, 15000);
        }
    }

    exportDBJson() {
        try {
            const data = this.db.getData();
            
            // Экспортируем только справочные данные, исключая пользовательские (users, characters, rooms)
            const exportData = {
                расы: data.расы || [],
                черты_рас: data.черты_рас || [],
                классы: data.классы || [],
                заклинания: data.заклинания || [],
                классы_заклинаний: data.классы_заклинаний || [],
                монстры: data.монстры || [],
                способности_монстров: data.способности_монстров || [],
                предметы: data.предметы || [],
                умения_классов: data.умения_классов || [],
                ячейки_заклинаний: data.ячейки_заклинаний || []
            };
            
            // Форматируем JSON с отступами для читаемости
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // Создаем Blob и скачиваем файл
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'DB.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            if (window.UI) {
                window.UI.showNotification('DB.json успешно экспортирован', 'success');
            }
        } catch (error) {
            console.error('Ошибка экспорта DB.json:', error);
            if (window.UI) {
                window.UI.showNotification('Ошибка экспорта DB.json', 'error');
            }
        }
    }

    async deleteEntity(entityType, entityId) {
        const confirmed = await window.confirmModal('Вы уверены, что хотите удалить эту сущность?', 'Подтверждение удаления', 'Удалить', 'Отмена');
        if (!confirmed) return;

        const typeMap = {
            'race': 'расы',
            'class': 'классы',
            'spell': 'заклинания',
            'monster': 'монстры',
            'item': 'предметы'
        };
        const dbKey = typeMap[entityType];
        let entities = this.db.getData(dbKey);
        if (!Array.isArray(entities)) {
            entities = [];
        }
        const filtered = entities.filter(e => e.id !== entityId);
        
        this.db.updateData(dbKey, filtered);
        this.render();
        
        if (window.UI) {
            window.UI.showNotification('Сущность удалена', 'success');
        }
    }

    getEntityTypeName(entityType) {
        const names = {
            'race': 'расу',
            'class': 'класс',
            'spell': 'заклинание',
            'monster': 'монстра',
            'item': 'предмет'
        };
        return names[entityType] || 'сущность';
    }

    closeEntityModal(modalOverlay) {
        if (!modalOverlay) return;
        
        // Предотвращаем множественные вызовы
        if (modalOverlay.dataset.closing === 'true' && !modalOverlay.classList.contains('active')) {
            return;
        }
        
        // Закрываем модальное окно
        modalOverlay.classList.remove('active');
        modalOverlay.style.setProperty('display', 'none', 'important');
        
        // Удаляем из DOM немедленно
        if (modalOverlay.parentNode) {
            modalOverlay.remove();
        }
    }

    async deleteUser(userId) {
        const confirmed = await window.confirmModal('Вы уверены, что хотите удалить этого пользователя?', 'Подтверждение удаления', 'Удалить', 'Отмена');
        if (!confirmed) return;
        const users = this.db.getData('users') || [];
        const filtered = users.filter(u => u.id !== userId);
        this.db.updateData('users', filtered);
        this.render();
        if (window.UI) {
            window.UI.showNotification('Пользователь удален', 'success');
        }
    }

    editUser(userId) {
        const users = this.db.getData('users') || [];
        const user = users.find(u => u.id === userId);
        if (!user) return;

        // Закрываем все существующие модальные окна
        const existingModals = document.querySelectorAll('.entity-edit-modal, .user-edit-modal');
        existingModals.forEach(modal => {
            if (modal && modal.parentNode) {
                modal.remove();
            }
        });

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay user-edit-modal';
        modalOverlay.innerHTML = `
            <div class="modal">
                <div class="modal__content">
                    <button class="modal__close" id="user-edit-close">&times;</button>
                    <h2>Редактировать пользователя</h2>
                    <form id="editUserForm" class="entity-form">
                        <div class="form-group">
                            <label class="form-label">Имя</label>
                            <input type="text" id="userName" class="form-input" required 
                                   value="${user.name || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" id="userEmail" class="form-input" required 
                                   value="${user.email || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Роль</label>
                            <select id="userRole" class="form-input">
                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>Пользователь</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Администратор</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelEditUser">Отмена</button>
                            <button type="submit" class="btn btn-primary">Сохранить</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        // Обработчики
        const closeBtn = modalOverlay.querySelector('.modal__close');
        const cancelBtn = modalOverlay.querySelector('#cancelEditUser');
        const form = modalOverlay.querySelector('#editUserForm');

        const closeModal = () => {
            if (modalOverlay && modalOverlay.parentNode && modalOverlay.dataset.closing !== 'true') {
                modalOverlay.dataset.closing = 'true';
                modalOverlay.classList.remove('active');
                modalOverlay.style.setProperty('display', 'none', 'important');
                setTimeout(() => {
                    if (modalOverlay && modalOverlay.parentNode) {
                        modalOverlay.remove();
                    }
                }, 0);
            }
        };

        if (closeBtn) {
            closeBtn.setAttribute('data-admin-close', 'true');
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                closeModal();
                return false;
            };
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                closeModal();
                return false;
            }, true);
        }

        if (cancelBtn) {
            cancelBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
                return false;
            };
        }

        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const name = modalOverlay.querySelector('#userName').value.trim();
                const email = modalOverlay.querySelector('#userEmail').value.trim();
                const role = modalOverlay.querySelector('#userRole').value;

                if (!name || !email) {
                    if (window.UI) {
                        window.UI.showNotification('Имя и email обязательны', 'error');
                    }
                    return;
                }

                user.name = name;
                user.email = email;
                user.role = role;

                const index = users.findIndex(u => u.id === userId);
                if (index !== -1) {
                    users[index] = user;
                    this.db.updateData('users', users);
                    this.render();
                    closeModal();
                    if (window.UI) {
                        window.UI.showNotification('Пользователь обновлен', 'success');
                    }
                }
            };
        }

        // Закрытие по клику на overlay
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            }
        };

        setTimeout(() => {
            if (modalOverlay && modalOverlay.parentNode) {
                modalOverlay.classList.add('active');
                modalOverlay.style.setProperty('display', 'flex', 'important');
            }
        }, 10);
    }

    async deleteCharacter(characterId) {
        const confirmed = await window.confirmModal('Вы уверены, что хотите удалить этого персонажа?', 'Подтверждение удаления', 'Удалить', 'Отмена');
        if (!confirmed) return;
        const characters = this.db.getCharacters();
        const filtered = characters.filter(c => c.id !== characterId);
        this.db.updateData('characters', filtered);
        this.render();
        if (window.UI) {
            window.UI.showNotification('Персонаж удален', 'success');
        }
    }

    editCharacter(characterId) {
        const characters = this.db.getCharacters();
        const character = characters.find(c => c.id === characterId);
        if (!character) return;

        const newName = prompt('Введите новое имя персонажа:', character.name);
        if (newName && newName.trim()) {
            character.name = newName.trim();
            const index = characters.findIndex(c => c.id === characterId);
            if (index !== -1) {
                characters[index] = character;
                this.db.updateData('characters', characters);
                this.render();
                if (window.UI) {
                    window.UI.showNotification('Персонаж обновлен', 'success');
                }
            }
        }
    }

    async deleteRoom(roomId) {
        const confirmed = await window.confirmModal('Вы уверены, что хотите удалить эту комнату?', 'Подтверждение удаления', 'Удалить', 'Отмена');
        if (!confirmed) return;
        const rooms = this.db.getRooms();
        const filtered = rooms.filter(r => r.id !== roomId);
        this.db.updateData('rooms', filtered);
        this.render();
        if (window.UI) {
            window.UI.showNotification('Комната удалена', 'success');
        }
    }

    exportData() {
        const data = this.db.getData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dnd_database_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        if (window.UI) {
            window.UI.showNotification('Данные экспортированы', 'success');
        }
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    // Сохраняем пользователей, персонажей и комнаты
                    const currentData = this.db.getData();
                    if (currentData.users) data.users = currentData.users;
                    if (currentData.characters) data.characters = currentData.characters;
                    if (currentData.rooms) data.rooms = currentData.rooms;
                    localStorage.setItem('dnd_database', JSON.stringify(data));
                    this.render();
                    if (window.UI) {
                        window.UI.showNotification('Данные импортированы', 'success');
                    }
                    window.dispatchEvent(new CustomEvent('databaseUpdated'));
                    
                    // Предлагаем экспортировать обновленный DB.json
                    setTimeout(() => {
                        this.offerExportDBJsonAfterImport();
                    }, 500);
                } catch (error) {
                    console.error('Ошибка импорта данных:', error);
                    if (window.UI) {
                        window.UI.showNotification('Ошибка импорта данных', 'error');
                    }
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    offerExportDBJsonAfterImport() {
        // Показываем уведомление с предложением экспортировать обновленный DB.json
        if (window.UI) {
            const notificationEl = document.createElement('div');
            notificationEl.className = 'notification notification-info';
            notificationEl.innerHTML = `
                <div class="notification__content" style="display: flex; align-items: center; gap: 10px;">
                    <div class="notification__icon">💾</div>
                    <div class="notification__text" style="flex: 1;">
                        <div class="notification__title">Экспорт DB.json</div>
                        <div class="notification__message">Хотите экспортировать обновленный DB.json после импорта?</div>
                    </div>
                    <button class="btn btn-primary" id="exportDBJsonAfterImportBtn" style="padding: 5px 15px; font-size: 0.9rem; white-space: nowrap;">Экспортировать</button>
                    <button class="notification__close" type="button" aria-label="Закрыть">&times;</button>
                </div>
            `;
            document.body.appendChild(notificationEl);
            
            setTimeout(() => {
                notificationEl.classList.add('active');
            }, 10);
            
            const exportBtn = notificationEl.querySelector('#exportDBJsonAfterImportBtn');
            const closeBtn = notificationEl.querySelector('.notification__close');
            
            if (exportBtn) {
                exportBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.exportDBJson();
                    if (notificationEl && notificationEl.parentNode) {
                        notificationEl.remove();
                    }
                };
            }
            
            if (closeBtn) {
                closeBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (notificationEl && notificationEl.parentNode) {
                        notificationEl.remove();
                    }
                };
            }
            
            // Автоматическое закрытие через 15 секунд
            setTimeout(() => {
                if (notificationEl && notificationEl.parentNode) {
                    notificationEl.remove();
                }
            }, 15000);
        }
    }

    async resetData() {
        const confirmed1 = await window.confirmModal('Вы уверены? Это удалит все данные кроме пользователей и комнат!', 'Подтверждение сброса', 'Продолжить', 'Отмена');
        if (!confirmed1) return;
        const confirmed2 = await window.confirmModal('Это действие необратимо! Продолжить?', 'Финальное подтверждение', 'Да, сбросить', 'Отмена');
        if (!confirmed2) return;
        
        fetch('./src/data/DB.json')
            .then(response => response.json())
            .then(data => {
                const currentData = this.db.getData();
                // Сохраняем пользователей и комнаты
                if (currentData.users) data.users = currentData.users;
                if (currentData.rooms) data.rooms = currentData.rooms;
                localStorage.setItem('dnd_database', JSON.stringify(data));
                this.render();
                if (window.UI) {
                    window.UI.showNotification('Данные сброшены', 'success');
                }
                window.dispatchEvent(new CustomEvent('databaseUpdated'));
            })
            .catch(error => {
                if (window.UI) {
                    window.UI.showNotification('Ошибка сброса данных', 'error');
                }
            });
    }
}
