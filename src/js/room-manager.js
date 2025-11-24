class RoomManager {
    constructor(database, auth) {
        this.db = database;
        this.auth = auth;
        this.currentRoom = null;
    }

    init() {
        this.renderRoomsList();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const createRoomBtn = document.getElementById('createRoomBtn');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => this.showCreateRoomModal());
        }

        // Слушатель обновлений базы данных
        window.addEventListener('databaseUpdated', () => {
            if (this.currentRoom) {
                this.loadRoom(this.currentRoom.id);
            } else {
                this.renderRoomsList();
            }
        });
    }

    renderRoomsList() {
        const container = document.getElementById('roomsList');
        if (!container) return;

        const rooms = this.db.getRooms(this.auth.currentUser?.id);
        container.innerHTML = `
            ${rooms.length === 0 ? `
                <div class="empty-state">
                    <p>У вас пока нет комнат</p>
                    <button class="btn-primary" id="createRoomBtn">Создать комнату</button>
                </div>
            ` : `
                <div class="room-manager__rooms-list">
                    ${rooms.map(room => `
                        <div class="room-card" data-room-id="${room.id}">
                            <div class="room-card-header">
                                <h3>${room.name}</h3>
                                <span class="room-status ${room.isPublic ? 'public' : 'private'}">
                                    ${room.isPublic ? 'Публичная' : 'Приватная'}
                                </span>
                            </div>
                            <div class="room-card-info">
                                <p><strong>Код:</strong> ${room.code}</p>
                                <p><strong>Участников:</strong> ${room.participants.length}</p>
                                <p><strong>Уровень:</strong> ${room.minLevel || 1}-${room.maxLevel || 20}</p>
                            </div>
                            <div class="room-card-actions">
                                <button class="btn-join" data-room-id="${room.id}">Войти</button>
                                ${room.ownerId === this.auth.currentUser?.id ? 
                                    `<button class="btn-delete" data-room-id="${room.id}">Удалить</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        `;

        container.querySelectorAll('.room-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Игнорируем клики на кнопки
                if (e.target.classList.contains('btn-join') || 
                    e.target.classList.contains('btn-delete') ||
                    e.target.closest('.btn-join') ||
                    e.target.closest('.btn-delete')) {
                    return;
                }
                const roomId = parseInt(card.dataset.roomId);
                if (roomId) {
                    this.showRoomDetails(roomId);
                }
            });
        });

        container.querySelectorAll('.btn-join').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const roomId = parseInt(btn.dataset.roomId);
                this.joinRoom(roomId);
            });
        });

        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const roomId = parseInt(btn.dataset.roomId);
                this.deleteRoom(roomId);
            });
        });
    }

    showCreateRoomModal() {
        const modal = document.getElementById('createRoomModal');
        if (modal) {
            modal.classList.add('active');
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        } else {
            this.createRoomModal();
        }
    }

    createRoomModal() {
        // Проверяем, не открыто ли уже модальное окно
        const existingModal = document.getElementById('createRoomModal');
        if (existingModal) {
            existingModal.classList.add('active');
            return;
        }

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = 'createRoomModal';
        modalOverlay.innerHTML = `
                <div class="modal__content create-room-modal">
                    <button class="modal__close">&times;</button>
                    <div class="create-room-header">
                        <h2>Создать комнату</h2>
                    </div>
                    <form id="createRoomForm" class="create-room-form">
                        <div class="form-group">
                            <label for="roomName" class="form-label">Название</label>
                            <input type="text" id="roomName" name="name" class="form-input" placeholder="Название комнаты" required>
                        </div>
                        <div class="form-group">
                            <label for="roomDescription" class="form-label">Описание</label>
                            <textarea id="roomDescription" name="description" class="form-input form-textarea" placeholder="Краткое описание комнаты" rows="3"></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="minLevel" class="form-label">Мин. уровень</label>
                                <input type="number" id="minLevel" name="minLevel" class="form-input" min="1" max="20" value="1">
                            </div>
                            <div class="form-group">
                                <label for="maxLevel" class="form-label">Макс. уровень</label>
                                <input type="number" id="maxLevel" name="maxLevel" class="form-input" min="1" max="20" value="20">
                            </div>
                        </div>
                        <div class="form-group form-group-checkbox">
                            <label class="checkbox-label">
                                <input type="checkbox" name="isPublic" class="checkbox-input" id="isPublic">
                                <span class="checkbox-text">Публичная комната</span>
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelCreateRoom">Отмена</button>
                            <button type="submit" class="btn btn-primary">Создать</button>
                        </div>
                    </form>
                </div>
        `;
        document.body.appendChild(modalOverlay);

        const cancelBtn = modalOverlay.querySelector('#cancelCreateRoom');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modalOverlay.classList.remove('active');
                setTimeout(() => {
                    if (modalOverlay.parentNode) {
                        modalOverlay.remove();
                    }
                }, 300);
            });
        }

        modalOverlay.querySelector('#createRoomForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateRoom(new FormData(e.target));
            modalOverlay.classList.remove('active');
            setTimeout(() => {
                if (modalOverlay.parentNode) {
                    modalOverlay.remove();
                }
            }, 300);
        });

        setTimeout(() => {
            modalOverlay.classList.add('active');
        }, 10);
    }

    handleCreateRoom(formData) {
        const roomData = {
            name: formData.get('name'),
            description: formData.get('description'),
            isPublic: formData.get('isPublic') === 'on',
            minLevel: parseInt(formData.get('minLevel')),
            maxLevel: parseInt(formData.get('maxLevel')),
            ownerId: this.auth.currentUser.id
        };

        const room = this.db.createRoom(roomData);
        document.getElementById('createRoomModal').classList.remove('active');
        this.joinRoom(room.id);
    }

    joinRoom(roomId) {
        const room = this.db.getRoomById(roomId);
        if (!room) {
            if (window.UI) {
                window.UI.showNotification('Комната не найдена', 'error');
            }
            return;
        }

        // Проверка уровня персонажа
        const userCharacters = this.db.getCharacters(this.auth.currentUser.id);
        const validCharacters = userCharacters.filter(c => 
            c.level >= (room.minLevel || 1) && c.level <= (room.maxLevel || 20)
        );

        if (validCharacters.length === 0) {
            if (window.UI) {
                window.UI.showNotification('У вас нет подходящих персонажей для этой комнаты', 'error');
            }
            return;
        }

        // Добавление участника если его еще нет
        const isParticipant = room.participants.some(p => p.userId === this.auth.currentUser.id);
        if (!isParticipant) {
            const participant = {
                userId: this.auth.currentUser.id,
                userName: this.auth.currentUser.name,
                characterId: validCharacters[0].id,
                joinedAt: new Date().toISOString()
            };
            room.participants.push(participant);
            this.db.updateRoom(roomId, { participants: room.participants });
        }

        // Активация комнаты если она неактивна
        if (!room.isActive) {
            this.db.updateRoom(roomId, { isActive: true });
        }

        // Перенаправление на страницу кампании
        window.location.hash = `#campaign?roomId=${roomId}`;
    }

    renderRoomInterface(room) {
        const container = document.getElementById('roomInterface');
        if (!container) return;

        container.innerHTML = `
            <div class="room-manager__room-interface">
                <div class="participants-panel">
                    <h3>Участники (${room.participants.length})</h3>
                    ${room.participants.map(p => {
                        const character = this.db.getCharacterById(p.characterId);
                        return `
                            <div class="participant-item">
                                <div class="participant-avatar"></div>
                                <div class="participant-info">
                                    <div class="name">${p.userName}</div>
                                    <div class="character">${character ? character.name : 'Без персонажа'}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="main-content">
                    <div class="room-header">
                        <h2>${room.name}</h2>
                        <p>Код комнаты: <strong>${room.code}</strong></p>
                        <button class="btn-secondary" id="leaveRoom">Покинуть комнату</button>
                    </div>
                    <div class="room-description">
                        <p>${room.description || 'Описание отсутствует'}</p>
                    </div>
                    <div class="dice-roller">
                        <h3>Бросок кубов</h3>
                        <div class="dice-controls">
                            <input type="number" id="diceCount" min="1" max="10" value="1">
                            <select id="diceType">
                                <option value="4">d4</option>
                                <option value="6">d6</option>
                                <option value="8">d8</option>
                                <option value="10">d10</option>
                                <option value="12">d12</option>
                                <option value="20" selected>d20</option>
                            </select>
                            <button class="btn-primary" id="rollDice">Бросить</button>
                        </div>
                        <div id="diceResults"></div>
                    </div>
                </div>
                <div class="chat-panel">
                    <div class="chat-messages" id="chatMessages">
                        ${room.messages.map(msg => `
                            <div class="message">
                                <div class="message-author">${msg.userName}</div>
                                <div class="message-text">${msg.text}</div>
                                <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="chat-input">
                        <input type="text" id="chatInput" placeholder="Введите сообщение...">
                        <button class="btn-primary" id="sendMessage">Отправить</button>
                    </div>
                </div>
            </div>
        `;

        // События
        document.getElementById('leaveRoom').addEventListener('click', () => {
            this.leaveRoom();
        });

        document.getElementById('sendMessage').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        document.getElementById('rollDice').addEventListener('click', () => {
            this.rollDice();
        });

        // Автопрокрутка чата
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;

        const message = {
            userId: this.auth.currentUser.id,
            userName: this.auth.currentUser.name,
            text: text,
            timestamp: new Date().toISOString()
        };

        const room = this.db.getRoomById(this.currentRoom.id);
        room.messages.push(message);
        this.db.updateRoom(room.id, { messages: room.messages });

        input.value = '';
        this.renderRoomInterface(room);
    }

    rollDice() {
        const count = parseInt(document.getElementById('diceCount').value) || 1;
        const type = parseInt(document.getElementById('diceType').value) || 20;
        const results = [];
        let total = 0;

        for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * type) + 1;
            results.push(roll);
            total += roll;
        }

        const resultsDiv = document.getElementById('diceResults');
        resultsDiv.innerHTML = `
            <div class="dice-result">
                <div class="dice-rolls">${results.join(', ')}</div>
                <div class="dice-total">Итого: ${total}</div>
            </div>
        `;

        // Отправка результата в чат
        const message = {
            userId: this.auth.currentUser.id,
            userName: this.auth.currentUser.name,
            text: `🎲 Бросок ${count}d${type}: ${results.join(', ')} = ${total}`,
            timestamp: new Date().toISOString()
        };

        const room = this.db.getRoomById(this.currentRoom.id);
        room.messages.push(message);
        this.db.updateRoom(room.id, { messages: room.messages });
        this.renderRoomInterface(room);
    }

    leaveRoom() {
        this.currentRoom = null;
        this.renderRoomsList();
        // Переключение на список комнат
        const roomInterface = document.getElementById('roomInterface');
        const roomsList = document.getElementById('roomsList');
        if (roomInterface) roomInterface.style.display = 'none';
        if (roomsList) roomsList.style.display = 'block';
    }

    async deleteRoom(roomId) {
        const confirmed = await window.confirmModal('Вы уверены, что хотите удалить эту комнату?', 'Подтверждение удаления', 'Удалить', 'Отмена');
        if (confirmed) {
            this.db.deleteRoom(roomId);
            this.renderRoomsList();
        }
    }

    showRoomDetails(roomId) {
        const room = this.db.getRoomById(roomId);
        if (!room) return;

        // Проверяем, не открыто ли уже модальное окно для этой комнаты
        const existingModal = document.querySelector(`[data-room-id="${roomId}"]`);
        if (existingModal) {
            existingModal.classList.add('active');
            return;
        }

        const owner = this.db.getUserById(room.ownerId);
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.setAttribute('data-room-id', roomId);
        modalOverlay.innerHTML = `
            <div class="modal">
                <div class="modal__content" style="max-width: 600px;">
                    <button class="modal__close">&times;</button>
                    <h2>${room.name}</h2>
                    <div class="room-details">
                        <p><strong>Код комнаты:</strong> ${room.code}</p>
                        <p><strong>Описание:</strong> ${room.description || 'Описание отсутствует'}</p>
                        <p><strong>Владелец:</strong> ${owner?.name || 'N/A'}</p>
                        <p><strong>Участников:</strong> ${room.participants.length}</p>
                        <p><strong>Уровень:</strong> ${room.minLevel || 1}-${room.maxLevel || 20}</p>
                        <p><strong>Тип:</strong> ${room.isPublic ? 'Публичная' : 'Приватная'}</p>
                        <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                            <button class="btn-primary" id="joinRoomBtn">Войти в комнату</button>
                            ${room.ownerId === this.auth.currentUser?.id ? 
                                `<button class="btn-secondary" id="deleteRoomBtn">Удалить</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        setTimeout(() => {
            modalOverlay.classList.add('active');
        }, 10);

        const joinBtn = modalOverlay.querySelector('#joinRoomBtn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                modalOverlay.classList.remove('active');
                setTimeout(() => {
                    if (modalOverlay.parentNode) {
                        modalOverlay.remove();
                    }
                }, 300);
                this.joinRoom(roomId);
            });
        }

        const deleteBtn = modalOverlay.querySelector('#deleteRoomBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const confirmed = await window.confirmModal('Вы уверены, что хотите удалить эту комнату?', 'Подтверждение удаления', 'Удалить', 'Отмена');
                if (confirmed) {
                    modalOverlay.classList.remove('active');
                    setTimeout(() => {
                        if (modalOverlay.parentNode) {
                            modalOverlay.remove();
                        }
                    }, 300);
                    this.deleteRoom(roomId);
                }
            });
        }
    }
}

