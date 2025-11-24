// Компонент для игровой кампании
class CampaignGame {
    constructor(database, auth) {
        this.db = database;
        this.auth = auth;
        this.roomId = null;
        this.room = null;
        this.autoSaveInterval = null;
    }

    init(roomId) {
        this.roomId = roomId;
        this.room = this.db.getRoomById(roomId);
        if (!this.room) {
            if (window.UI) {
                window.UI.showNotification('Комната не найдена', 'error');
            }
            window.location.hash = '#rooms';
            return;
        }

        // Инициализация данных кампании
        if (!this.room.campaignData) {
            this.room.campaignData = {
                notes: '',
                npcs: [],
                chat: [],
                tokens: [],
                lastSaved: new Date().toISOString()
            };
            this.db.updateRoom(roomId, { campaignData: this.room.campaignData });
        }

        this.render();
        this.setupEventListeners();
        this.startAutoSave();
    }

    render() {
        const container = document.getElementById('appContent');
        if (!container) return;

        container.innerHTML = `
            <div class="campaign-game">
                <!-- Шапка кампании -->
                <div class="campaign-header">
                    <div class="campaign-header__info">
                        <h1 class="campaign-title" contenteditable="true" data-field="name">${this.room.name || 'Новая кампания'}</h1>
                        <p class="campaign-description" contenteditable="true" data-field="description">${this.room.description || 'Описание кампании'}</p>
                        <div class="campaign-meta">
                            <span class="meta-item">
                                <span class="meta-label">Уровень:</span>
                                <span class="meta-value">${this.room.minLevel || 1} - ${this.room.maxLevel || 20}</span>
                            </span>
                            <span class="meta-item">
                                <span class="meta-label">Участников:</span>
                                <span class="meta-value">${this.room.participants?.length || 0}</span>
                            </span>
                            <span class="meta-item">
                                <span class="meta-label">Статус:</span>
                                <span class="meta-value status-${this.room.isActive ? 'active' : 'inactive'}">${this.room.isActive ? 'Активна' : 'Неактивна'}</span>
                            </span>
                        </div>
                    </div>
                    <div class="campaign-header__actions">
                        <button class="btn btn-secondary" id="saveCampaignBtn">Сохранить</button>
                        <button class="btn btn-secondary" id="invitePlayersBtn">Пригласить</button>
                        <button class="btn btn-danger" id="endSessionBtn">Завершить сессию</button>
                    </div>
                </div>

                <!-- Основной контент -->
                <div class="campaign-content">
                    <!-- Левая боковая панель -->
                    <div class="campaign-sidebar campaign-sidebar--left">
                        <!-- Участники -->
                        <div class="sidebar-section">
                            <h3 class="sidebar-title">Участники</h3>
                            <div class="participants-list" id="participantsList"></div>
                        </div>

                        <!-- Чат -->
                        <div class="sidebar-section sidebar-section--chat">
                            <h3 class="sidebar-title">Чат</h3>
                            <div class="chat-messages" id="chatMessages"></div>
                            <div class="chat-input-wrapper">
                                <input type="text" class="chat-input" id="chatInput" placeholder="Введите сообщение или формулу кубов (например: 1d20+5)">
                                <button class="btn btn-primary chat-send-btn" id="chatSendBtn">Отправить</button>
                            </div>
                        </div>
                    </div>

                    <!-- Центральная область - Персонажи игроков -->
                    <div class="campaign-main">
                        <div class="characters-display" id="charactersDisplay">
                            <!-- Карточки персонажей будут здесь -->
                        </div>

                        <!-- Блок бросков кубов -->
                        <div class="dice-roller">
                            <h4 class="dice-roller-title">Броски кубов</h4>
                            <div class="dice-buttons">
                                <button class="dice-btn" data-dice="1d20">1d20</button>
                                <button class="dice-btn" data-dice="1d12">1d12</button>
                                <button class="dice-btn" data-dice="1d10">1d10</button>
                                <button class="dice-btn" data-dice="1d8">1d8</button>
                                <button class="dice-btn" data-dice="1d6">1d6</button>
                                <button class="dice-btn" data-dice="1d4">1d4</button>
                                <button class="dice-btn" data-dice="1d100">1d100</button>
                            </div>
                            <div class="dice-custom">
                                <input type="text" class="dice-input" id="customDiceInput" placeholder="Кастомная формула (например: 2d6+3)">
                                <button class="btn btn-primary" id="rollCustomBtn">Бросить</button>
                            </div>
                        </div>
                    </div>

                    <!-- Правая боковая панель -->
                    <div class="campaign-sidebar campaign-sidebar--right">
                        <div class="sidebar-tabs">
                            <button class="sidebar-tab" data-tab="notes">Заметки</button>
                            <button class="sidebar-tab" data-tab="npcs">NPC</button>
                            <button class="sidebar-tab" data-tab="spells">Заклинания</button>
                            <button class="sidebar-tab" data-tab="items">Предметы</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderParticipants();
        this.renderChat();
        this.renderCharactersDisplay();
    }

    setupEventListeners() {
        // Сохранение
        const saveBtn = document.getElementById('saveCampaignBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCampaign());
        }

        // Завершение сессии
        const endSessionBtn = document.getElementById('endSessionBtn');
        if (endSessionBtn) {
            endSessionBtn.addEventListener('click', () => this.endSession());
        }

        // Чат
        const chatInput = document.getElementById('chatInput');
        const chatSendBtn = document.getElementById('chatSendBtn');
        if (chatInput && chatSendBtn) {
            chatSendBtn.addEventListener('click', () => {
                this.sendMessage();
                this.scrollToChatBottom();
            });
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                    this.scrollToChatBottom();
                }
            });
        }

        // Броски кубов
        document.querySelectorAll('.dice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const formula = e.target.dataset.dice;
                this.rollDice(formula);
            });
        });

        const rollCustomBtn = document.getElementById('rollCustomBtn');
        if (rollCustomBtn) {
            rollCustomBtn.addEventListener('click', () => {
                const input = document.getElementById('customDiceInput');
                if (input && input.value) {
                    this.rollDice(input.value);
                    input.value = '';
                }
            });
        }


        // Вкладки - открывают модальные окна
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.showTabModal(tabName);
            });
        });

        // Редактируемые поля
        const title = document.querySelector('.campaign-title');
        const description = document.querySelector('.campaign-description');
        if (title) {
            title.addEventListener('blur', () => {
                this.room.name = title.textContent;
                this.saveCampaign();
            });
        }
        if (description) {
            description.addEventListener('blur', () => {
                this.room.description = description.textContent;
                this.saveCampaign();
            });
        }

    }

    renderCharactersDisplay() {
        const container = document.getElementById('charactersDisplay');
        if (!container) return;

        const participants = this.room.participants || [];
        container.innerHTML = participants.map(p => {
            const character = this.db.getCharacterById(p.characterId);
            if (!character) return '';

            // Вычисляем здоровье и класс доспеха (если есть в данных персонажа)
            const health = character.health || character.hp || 20;
            const armorClass = character.armorClass || character.ac || 15;
            const level = character.level || 1;
            const className = character.class?.название || 'Без класса';
            const raceName = character.race?.название || 'Без расы';
            const characterName = character.name || 'Без имени';

            // Получаем иконку класса
            const classIcon = character.class?.фото || character.race?.фото || './src/img/classes/fighter.png';

            return `
                <div class="character-card-horizontal" data-character-id="${character.id}">
                    <div class="character-card__icon">
                        <img src="${classIcon}" alt="${className}" loading="lazy" onerror="this.src='./src/img/classes/fighter.png'">
                    <div class="character-card__class">${className.toUpperCase()}</div>

                    </div>
                    <div class="character-card__info">
                        <div class="character-card__name-race">${characterName}/${raceName.toUpperCase()}</div>
                        <div class="character-card__health">ЗДОРОВЬЕ: ${health}</div>
                        <div class="character-card__armor">КЛАСС ДОСПЕХА: ${armorClass}</div>
                    </div>
                    <div class="character-card__level">
                        <div class="character-card__level-number">${level}</div>
                        <div class="character-card__level-label">УРОВЕНЬ</div>
                        <button class="character-card__expand">▼</button>
                    </div>
                </div>
            `;
        }).join('') || '<div class="empty-state">Нет участников</div>';
    }

    renderParticipants() {
        const container = document.getElementById('participantsList');
        if (!container) return;

        const participants = this.room.participants || [];
        container.innerHTML = participants.map(p => {
            const character = this.db.getCharacterById(p.characterId);
            return `
                <div class="participant-item">
                    <div class="participant-avatar">
                        <img src="${character?.race?.фото || 'src/img/user.svg'}" alt="${p.userName}" loading="lazy">
                        <span class="participant-status online"></span>
                    </div>
                    <div class="participant-info">
                        <div class="participant-name">${p.userName}</div>
                        <div class="participant-character">${character?.name || 'Без персонажа'}</div>
                        <div class="participant-class">${character?.class?.название || ''}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderChat() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const messages = this.room.campaignData?.chat || [];
        container.innerHTML = messages.map(msg => {
            if (msg.type === 'dice') {
                return `
                    <div class="chat-message chat-message--dice">
                        <div class="message-author">${msg.author}</div>
                        <div class="message-content">
                            <span class="dice-formula">${msg.formula}</span>
                            <span class="dice-result ${msg.isCritical ? 'critical' : ''} ${msg.isFumble ? 'fumble' : ''}">${msg.result}</span>
                        </div>
                        <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
                    </div>
                `;
            }
            return `
                <div class="chat-message">
                    <div class="message-author">${msg.author}</div>
                    <div class="message-content">${msg.text}</div>
                    <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
            `;
        }).join('');

        // Прокрутка вниз после рендера
        this.scrollToChatBottom();
    }

    scrollToChatBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        if (!input || !input.value.trim()) return;

        const text = input.value.trim();
        const user = this.auth.currentUser;

        // Проверка на формулу кубов
        const diceMatch = text.match(/(\d+)d(\d+)([+-]\d+)?/i);
        if (diceMatch) {
            this.rollDice(text, true);
        } else {
            const message = {
                type: 'text',
                author: user.name,
                text: text,
                timestamp: new Date().toISOString()
            };

            if (!this.room.campaignData.chat) {
                this.room.campaignData.chat = [];
            }
            this.room.campaignData.chat.push(message);
            this.renderChat();
            this.saveCampaign();
        }

        input.value = '';
    }

    rollDice(formula, fromChat = false) {
        const user = this.auth.currentUser;
        const result = this.parseDiceFormula(formula);
        
        const message = {
            type: 'dice',
            author: user.name,
            formula: formula,
            result: result.total,
            rolls: result.rolls,
            isCritical: result.isCritical,
            isFumble: result.isFumble,
            timestamp: new Date().toISOString()
        };

        if (!this.room.campaignData.chat) {
            this.room.campaignData.chat = [];
        }
        this.room.campaignData.chat.push(message);
        this.renderChat();
        this.saveCampaign();
    }

    parseDiceFormula(formula) {
        const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/i);
        if (!match) {
            return { total: 0, rolls: [], isCritical: false, isFumble: false };
        }

        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);
        const modifier = match[3] ? parseInt(match[3]) : 0;

        const rolls = [];
        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * sides) + 1);
        }

        const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
        const isCritical = sides === 20 && rolls.every(r => r === 20);
        const isFumble = sides === 20 && rolls.every(r => r === 1);

        return { total, rolls, isCritical, isFumble };
    }

    showTabModal(tabName) {
        // Закрываем все существующие модальные окна
        const existingModals = document.querySelectorAll('.campaign-tab-modal');
        existingModals.forEach(modal => {
            if (modal && modal.parentNode) {
                modal.remove();
            }
        });

        const modalOverlay = document.createElement('div');
        modalOverlay.setAttribute('style', 'width: 100%');
        modalOverlay.className = 'modal-overlay campaign-tab-modal';
        
        let modalContent = '';
        let modalTitle = '';

        switch(tabName) {
            case 'notes':
                modalTitle = 'Заметки мастера';
                modalContent = `
                    <textarea class="notes-textarea-modal" id="notesTextareaModal" placeholder="Заметки мастера...">${this.room.campaignData?.notes || ''}</textarea>
                `;
                break;
            case 'npcs':
                modalTitle = 'NPC';
                const npcs = this.room.campaignData?.npcs || [];
                modalContent = `
                    <div class="npcs-list-modal" id="npcsListModal">
                        ${npcs.length > 0 ? npcs.map((npc, index) => {
                            const race = npc.raceId ? this.db.getRaces().find(r => r.id === npc.raceId) : npc.race;
                            const npcClass = npc.classId ? this.db.getClasses().find(c => c.id === npc.classId) : npc.class;
                            return `
                                <div class="npc-item-modal">
                                    <div class="npc-name">${npc.name}</div>
                                    <div class="npc-info">
                                        ${race ? `<span>Раса: ${race.название}</span>` : ''}
                                        ${npcClass ? `<span>Класс: ${npcClass.название}</span>` : ''}
                                        ${npc.level ? `<span>Уровень: ${npc.level}</span>` : ''}
                                    </div>
                                    ${npc.description ? `<div class="npc-description">${npc.description}</div>` : ''}
                                    <button class="btn btn-danger btn-small" data-npc-index="${index}">Удалить</button>
                                </div>
                            `;
                        }).join('') : '<p class="empty-state">Нет NPC</p>'}
                    </div>
                    <button class="btn btn-primary" id="addNpcBtnModal">+ Добавить NPC</button>
                `;
                break;
            case 'spells':
                modalTitle = 'Заклинания';
                const allSpells = this.db.getSpells();
                const schools = [...new Set(allSpells.map(s => s.школа).filter(Boolean))];
                const classes = this.db.getClasses();
                
                modalContent = `
                    <div class="spells-modal-container">
                        <div class="spells-modal-left">
                            <div class="spells-search-section">
                                <div class="search-input-wrapper">
                                    <input type="text" id="spellSearchInput" class="spell-search-input" placeholder="Поиск заклинаний...">
                                    <button class="search-clear-btn" id="spellSearchClear">×</button>
                                </div>
                            </div>

                            <div class="spells-list-section">
                                <div class="spells-list" id="spellsListContainer">
                                    ${this.renderSpellsList(allSpells)}
                                </div>
                            </div>
                        </div>
                        <div class="spells-modal-divider" id="spellsModalDivider"></div>
                        <div class="spells-modal-right">
                            <div class="spell-details" id="spellDetailsContainer">
                                <div class="spell-details-empty">
                                    <p>Выберите заклинание для просмотра деталей</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'items':
                modalTitle = 'Предметы';
                const items = this.db.getItems();
                modalContent = `
                    <div class="spellbook__monsters-grid items-grid-modal">
                        ${items.map(item => {
                            const photoPath = item.фото || `./src/img/items/${item.id || 'default'}.png`;
                            return `
                                <div class="item-card" data-item-id="${item.id}">
                                    <img src="${photoPath}" alt="${item.название}" 
                                         loading="lazy"
                                         onerror="this.src='./src/img/items/default.png'">
                                    <div class="card-content">
                                        <h3>${item.название}</h3>
                                        <p class="item-description">${item.описание ? (item.описание.length > 100 ? item.описание.substring(0, 100) + '...' : item.описание) : 'Описание отсутствует'}</p>
                                        <div class="stats">
                                            <div class="stat">
                                                <span class="stat-label">Тип:</span>
                                                <span>${item.тип}</span>
                                            </div>
                                            <div class="stat">
                                                <span class="stat-label">Редкость:</span>
                                                <span>${item.редкость}</span>
                                            </div>
                                            <div class="stat">
                                                <span class="stat-label">Стоимость:</span>
                                                <span>${item.стоимость}</span>
                                            </div>
                                            <div class="stat">
                                                <span class="stat-label">Вес:</span>
                                                <span>${item.вес} фунтов</span>
                                            </div>
                                        </div>
                                        ${item.свойства && item.свойства.length > 0 ? `<div class="bonuses">${item.свойства.join(', ')}</div>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
                break;
        }

        const isNotesModal = tabName === 'notes';
        const isWideModal = tabName === 'spells' || tabName === 'items';
        
        modalOverlay.innerHTML = `
                <div class="modal__content campaign-tab-modal-content ${isWideModal ? 'campaign-tab-modal-wide' : ''} ${isNotesModal ? 'notes-modal-content' : ''}">
                    <button class="modal__close" data-admin-close="true">&times;</button>
                    <h2>${modalTitle}</h2>
                    <div class="modal__body">
                        ${modalContent}
                    </div>
                </div>
        `;

        document.body.appendChild(modalOverlay);

        // Обработчики
        const closeBtn = modalOverlay.querySelector('.modal__close');
        const closeModal = () => {
            if (modalOverlay && modalOverlay.parentNode) {
                modalOverlay.classList.remove('active');
                modalOverlay.style.setProperty('display', 'none', 'important');
                setTimeout(() => {
                    if (modalOverlay && modalOverlay.parentNode) {
                        modalOverlay.remove();
                    }
                }, 300);
            }
        };

        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                closeModal();
                return false;
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

        // Специфичные обработчики для каждого типа модального окна
        if (tabName === 'notes') {
            const notesTextarea = modalOverlay.querySelector('#notesTextareaModal');
            if (notesTextarea) {
                let saveTimeout = null;
                notesTextarea.addEventListener('input', () => {
                    if (!this.room.campaignData) {
                        this.room.campaignData = {};
                    }
                    this.room.campaignData.notes = notesTextarea.value;
                    
                    // Автосохранение с задержкой
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        this.saveCampaign();
                    }, 1000);
                });
            }
        }

        // Обработчики для модального окна заклинаний
        if (tabName === 'spells') {
            // Небольшая задержка, чтобы убедиться, что DOM обновлен
            setTimeout(() => {
                this.setupSpellsModal(modalOverlay);
            }, 50);
        }

        if (tabName === 'items') {
            modalOverlay.querySelectorAll('.item-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = parseInt(card.dataset.itemId);
                    const item = this.db.getItems().find(i => i.id === id);
                    if (item) {
                        this.showItemDetails(item, modalOverlay);
                    }
                });
            });
        }

        if (tabName === 'npcs') {
            const addNpcBtn = modalOverlay.querySelector('#addNpcBtnModal');
            if (addNpcBtn) {
                addNpcBtn.addEventListener('click', () => {
                    this.showAddNpcModal(modalOverlay);
                });
            }

            modalOverlay.querySelectorAll('[data-npc-index]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.npcIndex);
                    this.room.campaignData.npcs.splice(index, 1);
                    this.showTabModal('npcs'); // Переоткрываем модальное окно
                });
            });
        }

        setTimeout(() => {
            if (modalOverlay && modalOverlay.parentNode) {
                modalOverlay.classList.add('active');
            }
        }, 10);
    }

    saveCampaign() {
        if (!this.room || !this.roomId) return;

        if (!this.room.campaignData) {
            this.room.campaignData = {};
        }
        this.room.campaignData.lastSaved = new Date().toISOString();
        this.db.updateRoom(this.roomId, {
            name: this.room.name,
            description: this.room.description,
            campaignData: this.room.campaignData
        });
    }

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.saveCampaign();
        }, 30000); // Каждые 30 секунд
    }

    endSession() {
        if (confirm('Завершить сессию?')) {
            this.room.isActive = false;
            this.db.updateRoom(this.roomId, { isActive: false });
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
            }
            window.location.hash = '#rooms';
        }
    }

    showAddNpcModal(parentModal) {
        const npcModalOverlay = document.createElement('div');
        npcModalOverlay.className = 'modal-overlay npc-create-modal';
        
        const races = this.db.getRaces();
        const classes = this.db.getClasses();
        
        npcModalOverlay.innerHTML = `
            <div class="modal">
                <div class="modal__content npc-create-modal-content">
                    <button class="modal__close" data-admin-close="true">&times;</button>
                    <h2>Создать NPC</h2>
                    <form id="npcCreateForm" class="npc-create-form">
                        <div class="form-group">
                            <label class="form-label">Имя NPC</label>
                            <input type="text" id="npcName" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Раса</label>
                            <select id="npcRace" class="form-input">
                                <option value="">Выберите расу</option>
                                ${races.map(race => `<option value="${race.id}">${race.название}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Класс</label>
                            <select id="npcClass" class="form-input">
                                <option value="">Выберите класс</option>
                                ${classes.map(cls => `<option value="${cls.id}">${cls.название}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Уровень</label>
                            <input type="number" id="npcLevel" class="form-input" min="1" max="20" value="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Описание</label>
                            <textarea id="npcDescription" class="form-input form-textarea" rows="4"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelNpcBtn" data-admin-close="true">Отмена</button>
                            <button type="submit" class="btn btn-primary">Создать NPC</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(npcModalOverlay);

        const closeModal = () => {
            if (npcModalOverlay && npcModalOverlay.parentNode) {
                npcModalOverlay.classList.remove('active');
                npcModalOverlay.style.setProperty('display', 'none', 'important');
                setTimeout(() => {
                    if (npcModalOverlay && npcModalOverlay.parentNode) {
                        npcModalOverlay.remove();
                    }
                }, 300);
            }
        };

        const closeBtn = npcModalOverlay.querySelector('.modal__close');
        const cancelBtn = npcModalOverlay.querySelector('#cancelNpcBtn');
        const form = npcModalOverlay.querySelector('#npcCreateForm');

        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                closeModal();
                return false;
            };
        }

        if (cancelBtn) {
            cancelBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
                return false;
            };
        }

        npcModalOverlay.onclick = (e) => {
            if (e.target === npcModalOverlay) {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            }
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = npcModalOverlay.querySelector('#npcName').value;
            const raceId = npcModalOverlay.querySelector('#npcRace').value;
            const classId = npcModalOverlay.querySelector('#npcClass').value;
            const level = parseInt(npcModalOverlay.querySelector('#npcLevel').value) || 1;
            const description = npcModalOverlay.querySelector('#npcDescription').value;

            if (!this.room.campaignData.npcs) {
                this.room.campaignData.npcs = [];
            }

            const race = raceId ? this.db.getRaces().find(r => r.id === parseInt(raceId)) : null;
            const npcClass = classId ? this.db.getClasses().find(c => c.id === parseInt(classId)) : null;

            this.room.campaignData.npcs.push({
                name,
                raceId: raceId ? parseInt(raceId) : null,
                classId: classId ? parseInt(classId) : null,
                level,
                description,
                race: race,
                class: npcClass
            });

            this.saveCampaign();
            closeModal();
            this.showTabModal('npcs'); // Переоткрываем модальное окно для обновления списка
        });

        setTimeout(() => {
            if (npcModalOverlay && npcModalOverlay.parentNode) {
                npcModalOverlay.classList.add('active');
                npcModalOverlay.style.setProperty('display', 'flex', 'important');
            }
        }, 10);
    }

    renderSpellsList(spells) {
        return spells.map(spell => {
            const photoPath = spell.фото || `./src/img/spells/${spell.id || 'default'}.png`;
            return `
                <div class="spell-list-item" data-spell-id="${spell.id}">
                    <img src="${photoPath}" alt="${spell.название}" 
                         loading="lazy"
                         onerror="this.src='./src/img/spells/default.png'"
                         class="spell-list-icon">
                    <div class="spell-list-info">
                        <div class="spell-list-name">${spell.название}</div>
                        <div class="spell-list-meta">
                            <span class="spell-level-badge level-${spell.уровень}">${spell.уровень}</span>
                            <span class="spell-school">${spell.школа || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupSpellsModal(modalOverlay) {
        // Ищем элементы внутри modal__body, так как структура изменилась
        const modalBody = modalOverlay.querySelector('.modal__body');
        if (!modalBody) {
            console.error('Не найден .modal__body в модальном окне заклинаний');
            return;
        }
        
        const searchInput = modalBody.querySelector('#spellSearchInput');
        const searchClear = modalBody.querySelector('#spellSearchClear');
        const spellsListContainer = modalBody.querySelector('#spellsListContainer');
        const spellDetailsContainer = modalBody.querySelector('#spellDetailsContainer');
        const divider = modalBody.querySelector('#spellsModalDivider');

        if (!spellsListContainer || !spellDetailsContainer) {
            console.error('Не найдены контейнеры для списка заклинаний или деталей');
            return;
        }

        let selectedSpellId = null;

        // Обработчик кликов на элементах списка - используем делегирование событий
        // Привязываем к modalBody для надежности, так как содержимое может перерисовываться
        const handleSpellItemClick = (e) => {
            const item = e.target.closest('.spell-list-item');
            if (!item) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const id = parseInt(item.dataset.spellId);
            if (isNaN(id)) {
                console.error('Неверный ID заклинания:', item.dataset.spellId);
                return;
            }
            
            const spell = this.db.getSpells().find(s => s.id === id);
            if (!spell) {
                console.error('Заклинание не найдено для ID:', id);
                return;
            }
            
            if (!spellDetailsContainer) {
                console.error('Контейнер для деталей заклинания не найден');
                return;
            }
            
            selectedSpellId = id;
            this.renderSpellDetails(spell, spellDetailsContainer);
            
            // Подсветка выбранного элемента
            spellsListContainer.querySelectorAll('.spell-list-item').forEach(i => {
                i.classList.remove('selected');
            });
            item.classList.add('selected');
        };

        // Привязываем обработчик к modalBody для надежности
        modalBody.addEventListener('click', handleSpellItemClick, true);

        // Функция фильтрации и отображения заклинаний
        const filterAndRenderSpells = () => {
            let spells = this.db.getSpells();
            const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

            // Поиск
            if (searchQuery) {
                spells = spells.filter(s => 
                    s.название.toLowerCase().includes(searchQuery) ||
                    (s.описание && s.описание.toLowerCase().includes(searchQuery)) ||
                    (s.школа && s.школа.toLowerCase().includes(searchQuery))
                );
            }

            // Сортировка по уровню и названию
            spells.sort((a, b) => {
                if (a.уровень !== b.уровень) {
                    return a.уровень - b.уровень;
                }
                return a.название.localeCompare(b.название);
            });

            spellsListContainer.innerHTML = this.renderSpellsList(spells);
        };

        // Инициализируем список заклинаний при первой загрузке
        filterAndRenderSpells();

        // Обработчики поиска
        if (searchInput) {
            searchInput.addEventListener('input', filterAndRenderSpells);
        }
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    filterAndRenderSpells();
                }
            });
        }

        // Перетаскиваемый разделитель
        let isDragging = false;
        if (divider) {
            divider.addEventListener('mousedown', (e) => {
                isDragging = true;
                e.preventDefault();
            });
        }

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const modal = modalOverlay.querySelector('.spells-modal-container');
            if (!modal) return;
            
            const rect = modal.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = (x / rect.width) * 100;
            
            // Ограничиваем диапазон 25%-75%
            const leftPercent = Math.max(25, Math.min(75, percentage));
            const rightPercent = 100 - leftPercent;
            
            const leftPanel = modalOverlay.querySelector('.spells-modal-left');
            const rightPanel = modalOverlay.querySelector('.spells-modal-right');
            
            if (leftPanel && rightPanel) {
                leftPanel.style.width = `${leftPercent}%`;
                rightPanel.style.width = `${rightPercent}%`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Инициализация списка
        filterAndRenderSpells();
    }

    renderSpellDetails(spell, container) {
        if (!container) {
            console.error('Контейнер для деталей заклинания не найден');
            return;
        }
        const photoPath = spell.фото || `./src/img/spells/${spell.id || 'default'}.png`;
        container.innerHTML = `
            <div class="spell-details-content">
                <div class="spell-details-header">
                    <img src="${photoPath}" alt="${spell.название}" 
                         loading="lazy"
                         onerror="this.src='./src/img/spells/default.png'"
                         class="spell-details-image">
                    <div class="spell-details-title">
                        <h2>${spell.название}</h2>
                        <div class="spell-details-badges">
                            <span class="spell-level-badge level-${spell.уровень}">Уровень ${spell.уровень}</span>
                            <span class="spell-school-badge">${spell.школа || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="spell-details-body">
                    <div class="spell-details-section">
                        <h3>Основная информация</h3>
                        <div class="spell-info-grid">
                            <div class="spell-info-item">
                                <span class="spell-info-label">Время накладывания:</span>
                                <span class="spell-info-value">${spell.время_накладывания || 'N/A'}</span>
                            </div>
                            <div class="spell-info-item">
                                <span class="spell-info-label">Дистанция:</span>
                                <span class="spell-info-value">${spell.дистанция || 'N/A'}</span>
                            </div>
                            <div class="spell-info-item">
                                <span class="spell-info-label">Компоненты:</span>
                                <span class="spell-info-value">${spell.компоненты ? spell.компоненты.join(', ') : 'N/A'}</span>
                            </div>
                            <div class="spell-info-item">
                                <span class="spell-info-label">Длительность:</span>
                                <span class="spell-info-value">${spell.длительность || 'N/A'}</span>
                            </div>
                            ${spell.ритуал ? `
                                <div class="spell-info-item">
                                    <span class="spell-info-label">Ритуал:</span>
                                    <span class="spell-info-value">Да</span>
                                </div>
                            ` : ''}
                            ${spell.концентрация ? `
                                <div class="spell-info-item">
                                    <span class="spell-info-label">Концентрация:</span>
                                    <span class="spell-info-value">Да</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    ${spell.описание ? `
                        <div class="spell-details-section">
                            <h3>Описание</h3>
                            <p class="spell-description-full">${spell.описание}</p>
                        </div>
                    ` : ''}
                    ${spell.на_высших_уровнях ? `
                        <div class="spell-details-section">
                            <h3>На высших уровнях</h3>
                            <p class="spell-higher-levels">${spell.на_высших_уровнях}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    showItemDetails(item, parentModal) {
        // Можно использовать существующую логику из spellbook или создать упрощенную версию
        alert(`${item.название}\nТип: ${item.тип}\nРедкость: ${item.редкость}\n\n${item.описание || 'Описание отсутствует'}`);
    }
}

// Экспорт для глобального использования
if (typeof window !== 'undefined') {
    window.CampaignGame = CampaignGame;
}

