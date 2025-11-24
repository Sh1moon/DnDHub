class CharacterList {
    constructor(database, auth) {
        this.db = database;
        this.auth = auth;
    }

    renderCharactersList(container) {
        if (!this.auth.isAuthenticated()) {
            container.innerHTML = `
                <div class="section">
                    <h2>Необходима авторизация</h2>
                    <p>Пожалуйста, войдите в систему для просмотра персонажей.</p>
                </div>
            `;
            return;
        }

        const characters = this.db.getCharacters(this.auth.currentUser.id);
        container.innerHTML = `
            <div class="characters-list">
                <div class="characters-list__header">
                    <h2>Мои персонажи</h2>
                    <a href="#character-creator" data-route="character-creator" class="btn-primary">Создать персонажа</a>
                </div>
                <div class="characters-grid">
                    ${characters.length === 0 ? `
                        <div class="empty-state">
                            <p>У вас пока нет персонажей</p>
                            <a href="#character-creator" data-route="character-creator" class="btn-primary">Создать первого персонажа</a>
                        </div>
                    ` : characters.map(char => `
                        <div class="character-card" data-character-id="${char.id}">
                            <img src="${char.race?.фото || './src/img/classes/fighter.png'}" 
                                 alt="${char.name}" 
                                 onerror="this.src='./src/img/classes/fighter.png'">
                            <div class="card-content">
                                <h3>${char.name || 'Без имени'}</h3>
                                <p class="character-description">${char.race?.название || 'N/A'} ${char.class?.название || ''}</p>
                                <div class="stats">
                                    <div class="stat">
                                        <span class="stat-label">Раса:</span>
                                        <span>${char.race?.название || 'N/A'}</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">Класс:</span>
                                        <span>${char.class?.название || 'N/A'}</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">Уровень:</span>
                                        <span>${char.level || 1}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Добавляем обработчики кликов
        container.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('click', () => {
                const charId = parseInt(card.dataset.characterId);
                this.showCharacterDetails(charId);
            });
        });
    }

    showCharacterDetails(characterId) {
        const character = this.db.getCharacterById(characterId);
        if (!character) return;

        // Проверяем, не открыто ли уже модальное окно для этого персонажа
        const existingModal = document.querySelector(`[data-character-id="${characterId}"]`);
        if (existingModal) {
            existingModal.classList.add('active');
            return;
        }

        const race = character.race || {};
        const classData = character.class || {};
        const user = this.db.getUserById(character.userId);

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.setAttribute('data-character-id', characterId);
        modalOverlay.innerHTML = `
            <div class="modal">
                <div class="modal__content" style="max-width: 700px;">
                    <button class="modal__close">&times;</button>
                    <div class="character-details">
                        <div class="character-details__header">
                            <img src="${race.фото || 'src/img/classes/fighter.png'}" 
                                 alt="${character.name}" 
                                 class="character-details__image"
                                 onerror="this.src='./src/img/classes/fighter.png'">
                            <div class="character-details__info">
                                <h2>${character.name || 'Без имени'}</h2>
                                <p><strong>Раса:</strong> ${race.название || 'N/A'}</p>
                                <p><strong>Класс:</strong> ${classData.название || 'N/A'}</p>
                                <p><strong>Уровень:</strong> ${character.level || 1}</p>
                                <p><strong>Владелец:</strong> ${user?.name || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="character-details__stats">
                            <h3>Характеристики</h3>
                            <div class="stats-grid">
                                ${Object.keys(character.stats || {}).map(stat => {
                                    const value = character.stats[stat];
                                    const modifier = Math.floor((value - 10) / 2);
                                    return `
                                        <div class="stat-item">
                                            <div class="stat-label">${this.getStatName(stat)}</div>
                                            <div class="stat-value">${value}</div>
                                            <div class="stat-modifier">${modifier >= 0 ? '+' : ''}${modifier}</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        ${character.equipment && character.equipment.length > 0 ? `
                            <div class="character-details__equipment">
                                <h3>Снаряжение</h3>
                                <ul>
                                    ${character.equipment.map(itemId => {
                                        const item = this.db.getItems().find(i => i.id === itemId);
                                        return item ? `<li>${item.название}</li>` : '';
                                    }).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${character.background ? `
                            <div class="character-details__background">
                                <h3>Предыстория</h3>
                                <p>${character.background}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        setTimeout(() => {
            modalOverlay.classList.add('active');
        }, 10);
    }

    getStatName(stat) {
        const names = {
            сила: 'Сила',
            ловкость: 'Ловкость',
            телосложение: 'Телосложение',
            интеллект: 'Интеллект',
            мудрость: 'Мудрость',
            харизма: 'Харизма'
        };
        return names[stat] || stat;
    }
}

