class Spellbook {
    constructor(database) {
        this.db = database;
        this.searchTimeout = null;
        this.currentCategory = 'spells';
        this.searchQuery = '';
        this.filters = {
            level: null,
            school: null,
            class: null
        };
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Поиск с дебаунсом
        const searchInput = document.getElementById('spellbookSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }

        // Фильтры
        const levelFilter = document.getElementById('levelFilter');
        const schoolFilter = document.getElementById('schoolFilter');
        const classFilter = document.getElementById('classFilter');

        if (levelFilter) {
            levelFilter.addEventListener('change', (e) => {
                this.filters.level = e.target.value || null;
                this.render();
            });
        }

        if (schoolFilter) {
            schoolFilter.addEventListener('change', (e) => {
                this.filters.school = e.target.value || null;
                this.render();
            });
        }

        if (classFilter) {
            classFilter.addEventListener('change', (e) => {
                this.filters.class = e.target.value || null;
                this.render();
            });
        }

        // Переключение категорий
        document.querySelectorAll('.spellbook-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.currentCategory = e.target.dataset.category;
                // Сохраняем поисковый запрос при переключении категорий
                const searchInput = document.getElementById('spellbookSearch');
                if (searchInput) {
                    this.searchQuery = searchInput.value.trim();
                }
                this.render();
            });
        });
    }

    handleSearch(query) {
        this.searchQuery = query.trim();
        
        if (this.searchQuery.length < 2) {
            this.hideSuggestions();
            this.searchQuery = '';
            // Обновляем контент, чтобы показать все элементы
            this.updateContent();
            return;
        }

        const suggestions = this.getSearchSuggestions(this.searchQuery);
        this.showSuggestions(suggestions);

        // Обновляем контент с учетом поискового запроса
        this.updateContent();

        // Автоматический выбор лучшего совпадения через 3 секунды (только если есть подсказки)
        if (suggestions.length > 0) {
            clearTimeout(this.autoSelectTimeout);
            this.autoSelectTimeout = setTimeout(() => {
                if (suggestions.length > 0) {
                    this.selectBestMatch(suggestions[0]);
                }
            }, 3000);
        }
    }

    updateContent() {
        const contentContainer = document.querySelector('.spellbook__content');
        if (contentContainer) {
            contentContainer.innerHTML = this.renderContent();
            this.setupCardClickHandlers();
        }
    }

    getSearchSuggestions(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        switch (this.currentCategory) {
            case 'spells':
                const spells = this.db.getSpells();
                spells.forEach(spell => {
                    const score = this.calculateMatchScore(spell.название, lowerQuery);
                    if (score > 0) {
                        results.push({
                            type: 'spell',
                            item: spell,
                            score: score
                        });
                    }
                });
                break;

            case 'monsters':
                const monsters = this.db.getMonsters();
                monsters.forEach(monster => {
                    const score = this.calculateMatchScore(monster.название, lowerQuery);
                    if (score > 0) {
                        results.push({
                            type: 'monster',
                            item: monster,
                            score: score
                        });
                    }
                });
                break;

            case 'items':
                const items = this.db.getItems();
                items.forEach(item => {
                    const score = this.calculateMatchScore(item.название, lowerQuery);
                    if (score > 0) {
                        results.push({
                            type: 'item',
                            item: item,
                            score: score
                        });
                    }
                });
                break;

            case 'races':
                const races = this.db.getRaces();
                races.forEach(race => {
                    const score = this.calculateMatchScore(race.название, lowerQuery);
                    if (score > 0) {
                        results.push({
                            type: 'race',
                            item: race,
                            score: score
                        });
                    }
                });
                break;

            case 'classes':
                const classes = this.db.getClasses();
                classes.forEach(cls => {
                    const score = this.calculateMatchScore(cls.название, lowerQuery);
                    if (score > 0) {
                        results.push({
                            type: 'class',
                            item: cls,
                            score: score
                        });
                    }
                });
                break;
        }

        // Сортировка по релевантности
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, 5);
    }

    calculateMatchScore(text, query) {
        const lowerText = text.toLowerCase();
        
        // Точное совпадение
        if (lowerText === query) return 100;
        
        // Начинается с запроса
        if (lowerText.startsWith(query)) return 80;
        
        // Содержит запрос
        if (lowerText.includes(query)) return 60;
        
        // Частичное совпадение слов
        const words = lowerText.split(' ');
        const queryWords = query.split(' ');
        let wordMatches = 0;
        
        queryWords.forEach(qWord => {
            if (words.some(w => w.startsWith(qWord))) {
                wordMatches++;
            }
        });
        
        if (wordMatches > 0) {
            return 40 + (wordMatches / queryWords.length) * 20;
        }
        
        return 0;
    }

    showSuggestions(suggestions) {
        const container = document.querySelector('.search-suggestions');
        if (!container) return;

        if (suggestions.length === 0) {
            container.classList.remove('active');
            return;
        }

        container.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" data-type="${suggestion.type}" data-id="${suggestion.item.id}">
                <div class="suggestion-name">${suggestion.item.название}</div>
                <div class="suggestion-info">
                    ${this.getSuggestionInfo(suggestion)}
                </div>
            </div>
        `).join('');

        container.classList.add('active');

        // Обработка клика по предложению
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                const id = parseInt(item.dataset.id);
                this.selectItem(type, id);
            });
        });
    }

    getSuggestionInfo(suggestion) {
        switch (suggestion.type) {
            case 'spell':
                return `Уровень ${suggestion.item.уровень}, ${suggestion.item.школа}`;
            case 'monster':
                return `CR ${suggestion.item.рейтинг_сложности}, ${suggestion.item.тип}`;
            case 'item':
                return `${suggestion.item.тип}, ${suggestion.item.редкость}`;
            default:
                return '';
        }
    }

    hideSuggestions() {
        const container = document.querySelector('.search-suggestions');
        if (container) {
            container.classList.remove('active');
        }
    }

    selectBestMatch(suggestion) {
        // Автоматически выбираем лучшее совпадение
        const searchInput = document.getElementById('spellbookSearch');
        if (searchInput && suggestion) {
            searchInput.value = suggestion.item.название;
            this.selectItem(suggestion.type, suggestion.item.id);
        }
    }

    selectItem(type, id) {
        this.hideSuggestions();
        this.showItemDetails(type, id);
    }

    showItemDetails(type, id) {
        let item;
        switch (type) {
            case 'spell':
                item = this.db.getSpells().find(s => s.id === id);
                break;
            case 'monster':
                item = this.db.getMonsters().find(m => m.id === id);
                break;
            case 'item':
                item = this.db.getItems().find(i => i.id === id);
                break;
            case 'race':
                item = this.db.getRaces().find(r => r.id === id);
                break;
            case 'class':
                item = this.db.getClasses().find(c => c.id === id);
                break;
        }

        if (!item) return;

        // Проверяем, не открыто ли уже модальное окно для этого элемента
        const existingModal = document.querySelector(`[data-item-id="${item.id}"][data-item-type="${type}"]`);
        if (existingModal) {
            existingModal.classList.add('active');
            existingModal.style.setProperty('display', 'flex', 'important');
            return;
        }

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'entity-modal-overlay';
        modalOverlay.setAttribute('data-item-id', item.id);
        modalOverlay.setAttribute('data-item-type', type);
        modalOverlay.innerHTML = `
            <div class="entity-modal">
                <div class="entity-modal__header">
                    <h2>${item.название}</h2>
                    <button class="entity-modal__close" aria-label="Закрыть">&times;</button>
                </div>
                <div class="entity-modal__body">
                    ${this.renderItemDetails(type, item)}
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        // Обработчик закрытия
        const closeBtn = modalOverlay.querySelector('.entity-modal__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeEntityModal(modalOverlay);
            });
        }

        // Закрытие при клике на overlay
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.closeEntityModal(modalOverlay);
            }
        });

        // Закрытие по Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
                this.closeEntityModal(modalOverlay);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        setTimeout(() => {
            modalOverlay.classList.add('active');
            modalOverlay.style.setProperty('display', 'flex', 'important');
        }, 10);
    }

    closeEntityModal(modal) {
        if (modal) {
            modal.classList.remove('active');
            modal.style.setProperty('display', 'none', 'important');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 300);
        }
    }

    renderItemDetails(type, item) {
        // Проверяем наличие фото для всех типов
        const hasPhoto = item.фото || (type === 'spell' && item.id);
        const photoPath = item.фото || (type === 'spell' ? `./src/img/spells/${item.id || 'default'}.png` : null);
        
        switch (type) {
            case 'spell':
                return `
                    <div class="item-details-layout">
                        ${hasPhoto ? `
                            <div class="item-details-image">
                                <img src="${photoPath}" alt="${item.название}" loading="lazy" onerror="this.src='./src/img/spells/default.png'">
                            </div>
                        ` : ''}
                        <div class="item-details-content">
                            <h3>Основная информация</h3>
                            <p><strong>Уровень:</strong> ${item.уровень}</p>
                            <p><strong>Школа:</strong> ${item.школа}</p>
                            <p><strong>Время накладывания:</strong> ${item.время_накладывания}</p>
                            <p><strong>Дистанция:</strong> ${item.дистанция}</p>
                            <p><strong>Компоненты:</strong> ${item.компоненты ? item.компоненты.join(', ') : 'N/A'}</p>
                            <p><strong>Длительность:</strong> ${item.длительность}</p>
                            ${item.описание ? `<p><strong>Описание:</strong> ${item.описание}</p>` : ''}
                            ${item.на_высших_уровнях ? `<p><strong>На высших уровнях:</strong> ${item.на_высших_уровнях}</p>` : ''}
                        </div>
                    </div>
                `;
            case 'monster':
                return `
                    <div class="item-details-layout">
                        ${hasPhoto ? `
                            <div class="item-details-image">
                                <img src="${item.фото}" alt="${item.название}" loading="lazy" onerror="this.src='src/img/monsters/goblin.png'">
                            </div>
                        ` : ''}
                        <div class="item-details-content">
                            <h3>Характеристики</h3>
                            <p><strong>Размер:</strong> ${item.размер}</p>
                            <p><strong>Тип:</strong> ${item.тип}</p>
                            <p><strong>Класс доспеха:</strong> ${item.класс_доспеха}</p>
                            <p><strong>Хиты:</strong> ${item.хиты}</p>
                            <p><strong>Скорость:</strong> ${item.скорость}</p>
                            <p><strong>Рейтинг сложности:</strong> ${item.рейтинг_сложности}</p>
                            ${item.описание ? `<p><strong>Описание:</strong> ${item.описание}</p>` : ''}
                        </div>
                    </div>
                `;
            case 'item':
                return `
                    <div class="item-details-layout">
                        ${hasPhoto ? `
                            <div class="item-details-image">
                                <img src="${item.фото}" alt="${item.название}" loading="lazy" onerror="this.src='./src/img/items/longsword.png'">
                            </div>
                        ` : ''}
                        <div class="item-details-content">
                            <h3>Характеристики</h3>
                            <p><strong>Тип:</strong> ${item.тип}</p>
                            <p><strong>Редкость:</strong> ${item.редкость}</p>
                            <p><strong>Стоимость:</strong> ${item.стоимость}</p>
                            <p><strong>Вес:</strong> ${item.вес} фунтов</p>
                            ${item.свойства && item.свойства.length > 0 ? `<p><strong>Свойства:</strong> ${item.свойства.join(', ')}</p>` : ''}
                            ${item.описание ? `<p><strong>Описание:</strong> ${item.описание}</p>` : ''}
                        </div>
                    </div>
                `;
            case 'race':
                return `
                    <div class="item-details-layout">
                        ${hasPhoto ? `
                            <div class="item-details-image">
                                <img src="${item.фото}" alt="${item.название}" loading="lazy" onerror="this.src='./src/img/races/human.png'">
                            </div>
                        ` : ''}
                        <div class="item-details-content">
                            <h3>Характеристики расы</h3>
                            ${item.скорость ? `<p><strong>Скорость:</strong> ${item.скорость} футов</p>` : ''}
                            ${item.размер ? `<p><strong>Размер:</strong> ${item.размер}</p>` : ''}
                            ${item.бонус_силы ? `<p><strong>Бонус силы:</strong> +${item.бонус_силы}</p>` : ''}
                            ${item.бонус_ловкости ? `<p><strong>Бонус ловкости:</strong> +${item.бонус_ловкости}</p>` : ''}
                            ${item.бонус_телосложения ? `<p><strong>Бонус телосложения:</strong> +${item.бонус_телосложения}</p>` : ''}
                            ${item.бонус_интеллекта ? `<p><strong>Бонус интеллекта:</strong> +${item.бонус_интеллекта}</p>` : ''}
                            ${item.бонус_мудрости ? `<p><strong>Бонус мудрости:</strong> +${item.бонус_мудрости}</p>` : ''}
                            ${item.бонус_харизмы ? `<p><strong>Бонус харизмы:</strong> +${item.бонус_харизмы}</p>` : ''}
                            ${item.описание ? `<p><strong>Описание:</strong> ${item.описание}</p>` : ''}
                        </div>
                    </div>
                `;
            case 'class':
                return `
                    <div class="item-details-layout">
                        ${hasPhoto ? `
                            <div class="item-details-image">
                                <img src="${item.фото}" alt="${item.название}" loading="lazy" onerror="this.src='./src/img/classes/fighter.png'">
                            </div>
                        ` : ''}
                        <div class="item-details-content">
                            <h3>Характеристики класса</h3>
                            ${item.хиты_за_уровень ? `<p><strong>Хиты за уровень:</strong> ${item.хиты_за_уровень}</p>` : ''}
                            ${item.владение_доспехами && item.владение_доспехами.length > 0 ? `<p><strong>Владение доспехами:</strong> ${item.владение_доспехами.join(', ')}</p>` : ''}
                            ${item.владение_оружием && item.владение_оружием.length > 0 ? `<p><strong>Владение оружием:</strong> ${item.владение_оружием.join(', ')}</p>` : ''}
                            ${item.владение_инструментами && item.владение_инструментами.length > 0 ? `<p><strong>Владение инструментами:</strong> ${item.владение_инструментами.join(', ')}</p>` : ''}
                            ${item.спасительные_броски && item.спасительные_броски.length > 0 ? `<p><strong>Спасительные броски:</strong> ${item.спасительные_броски.join(', ')}</p>` : ''}
                            ${item.описание ? `<p><strong>Описание:</strong> ${item.описание}</p>` : ''}
                        </div>
                    </div>
                `;
            default:
                return '';
        }
    }

    render() {
        const container = document.getElementById('spellbookContent');
        if (!container) return;

        container.innerHTML = `
            <div class="spellbook">
                <div class="spellbook__header">
                    <h2>Справочник</h2>
                    <div class="search-container">
                        <input type="text" id="spellbookSearch" placeholder="Поиск..." value="${this.searchQuery || ''}">
                        <div class="search-suggestions"></div>
                    </div>
                    <div class="filters">
                        ${this.renderFilters()}
                    </div>
                </div>
                <div class="spellbook-tabs">
                    <button class="spellbook-tab ${this.currentCategory === 'spells' ? 'active' : ''}" 
                            data-category="spells">Заклинания</button>
                    <button class="spellbook-tab ${this.currentCategory === 'monsters' ? 'active' : ''}" 
                            data-category="monsters">Монстры</button>
                    <button class="spellbook-tab ${this.currentCategory === 'items' ? 'active' : ''}" 
                            data-category="items">Предметы</button>
                    <button class="spellbook-tab ${this.currentCategory === 'races' ? 'active' : ''}" 
                            data-category="races">Расы</button>
                    <button class="spellbook-tab ${this.currentCategory === 'classes' ? 'active' : ''}" 
                            data-category="classes">Классы</button>
                </div>
                <div class="spellbook__content">
                    ${this.renderContent()}
                </div>
            </div>
        `;

        // Настройка обработчиков после рендера
        setTimeout(() => {
            this.setupEventListeners();
            this.setupCardClickHandlers();
        }, 100);
    }

    setupCardClickHandlers() {
        const container = document.querySelector('.spellbook__content');
        if (!container) return;

        // Обработчики для заклинаний
        container.querySelectorAll('.spell-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.spellId);
                this.showItemDetails('spell', id);
            });
        });

        // Обработчики для монстров
        container.querySelectorAll('.monster-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.monsterId);
                this.showItemDetails('monster', id);
            });
        });

        // Обработчики для предметов
        container.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.itemId);
                this.showItemDetails('item', id);
            });
        });

        // Обработчики для рас
        container.querySelectorAll('.race-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.raceId);
                this.showItemDetails('race', id);
            });
        });

        // Обработчики для классов
        container.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.classId);
                this.showItemDetails('class', id);
            });
        });
    }

    renderFilters() {
        if (this.currentCategory === 'spells') {
            const spells = this.db.getSpells();
            const levels = [...new Set(spells.map(s => s.уровень))].sort();
            const schools = [...new Set(spells.map(s => s.школа))];

            return `
                <select id="levelFilter">
                    <option value="">Все уровни</option>
                    ${levels.map(l => `<option value="${l}">Уровень ${l}</option>`).join('')}
                </select>
                <select id="schoolFilter">
                    <option value="">Все школы</option>
                    ${schools.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
            `;
        }
        return '';
    }

    renderContent() {
        switch (this.currentCategory) {
            case 'spells':
                return this.renderSpells();
            case 'monsters':
                return this.renderMonsters();
            case 'items':
                return this.renderItems();
            case 'races':
                return this.renderRaces();
            case 'classes':
                return this.renderClasses();
            default:
                return '';
        }
    }

    renderSpells() {
        let spells = this.db.getSpells();

        // Применение фильтров
        if (this.filters.level) {
            spells = spells.filter(s => s.уровень === parseInt(this.filters.level));
        }
        if (this.filters.school) {
            spells = spells.filter(s => s.школа === this.filters.school);
        }

        // Применение поискового запроса
        if (this.searchQuery && this.searchQuery.length >= 2) {
            const lowerQuery = this.searchQuery.toLowerCase();
            spells = spells.filter(spell => {
                const name = (spell.название || '').toLowerCase();
                const description = (spell.описание || '').toLowerCase();
                const school = (spell.школа || '').toLowerCase();
                return name.includes(lowerQuery) || 
                       description.includes(lowerQuery) || 
                       school.includes(lowerQuery);
            });
        }

        return `
            <div class="spellbook__monsters-grid">
                ${spells.map(spell => {
                    const photoPath = spell.фото || `src/img/spells/${spell.id || 'default'}.png`;
                    return `
                        <div class="spell-card" data-spell-id="${spell.id}">
                            <img src="${photoPath}" alt="${spell.название}" 
                                 loading="lazy"
                                 onerror="this.src='./src/img/spells/default.png'">
                            <div class="card-content">
                                <h3>${spell.название}</h3>
                                <p class="spell-description">${spell.описание ? (spell.описание.length > 100 ? spell.описание.substring(0, 100) + '...' : spell.описание) : 'Описание отсутствует'}</p>
                                <div class="stats">
                                    <div class="stat">
                                        <span class="stat-label">Уровень:</span>
                                        <span>${spell.уровень}</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">Школа:</span>
                                        <span>${spell.школа}</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">Время:</span>
                                        <span>${spell.время_накладывания}</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">Дистанция:</span>
                                        <span>${spell.дистанция}</span>
                                    </div>
                                </div>
                                ${spell.компоненты && spell.компоненты.length > 0 ? `<div class="bonuses">${spell.компоненты.join(', ')}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderMonsters() {
        let monsters = this.db.getMonsters();

        // Применение поискового запроса
        if (this.searchQuery && this.searchQuery.length >= 2) {
            const lowerQuery = this.searchQuery.toLowerCase();
            monsters = monsters.filter(monster => {
                const name = (monster.название || '').toLowerCase();
                const description = (monster.описание || '').toLowerCase();
                const type = (monster.тип || '').toLowerCase();
                return name.includes(lowerQuery) || 
                       description.includes(lowerQuery) || 
                       type.includes(lowerQuery);
            });
        }

        return `
            <div class="spellbook__monsters-grid">
                ${monsters.map(monster => `
                    <div class="monster-card" data-monster-id="${monster.id}">
                        <img src="${monster.фото || 'src/img/monsters/goblin.png'}" 
                             alt="${monster.название}" 
                             loading="lazy"
                             onerror="this.src='./src/img/monsters/goblin.png'">
                        <div class="card-content">
                            <h3>${monster.название}</h3>
                            <div class="stats">
                                <div class="stat">
                                    <span class="stat-label">CR:</span> ${monster.рейтинг_сложности}
                                </div>
                                <div class="stat">
                                    <span class="stat-label">КД:</span> ${monster.класс_доспеха}
                                </div>
                                <div class="stat">
                                    <span class="stat-label">Хиты:</span> ${monster.хиты}
                                </div>
                                <div class="stat">
                                    <span class="stat-label">Тип:</span> ${monster.тип}
                                </div>
                            </div>
                            <p>${monster.описание ? (monster.описание.length > 100 ? monster.описание.substring(0, 100) + '...' : monster.описание) : ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderItems() {
        let items = this.db.getItems();

        // Применение поискового запроса
        if (this.searchQuery && this.searchQuery.length >= 2) {
            const lowerQuery = this.searchQuery.toLowerCase();
            items = items.filter(item => {
                const name = (item.название || '').toLowerCase();
                const description = (item.описание || '').toLowerCase();
                const type = (item.тип || '').toLowerCase();
                const rarity = (item.редкость || '').toLowerCase();
                return name.includes(lowerQuery) || 
                       description.includes(lowerQuery) || 
                       type.includes(lowerQuery) ||
                       rarity.includes(lowerQuery);
            });
        }

        return `
            <div class="spellbook__items-grid">
                ${items.map(item => `
                    <div class="item-card" data-item-id="${item.id}">
                        <img src="${item.фото || 'src/img/items/longsword.png'}" 
                             alt="${item.название}" 
                             loading="lazy"
                             onerror="this.src='./src/img/items/longsword.png'">
                        <div class="card-content">
                            <h3>${item.название}</h3>
                            <p><strong>Тип:</strong> ${item.тип}</p>
                            <p><strong>Редкость:</strong> ${item.редкость}</p>
                            <p><strong>Стоимость:</strong> ${item.стоимость}</p>
                            <p>${item.описание ? (item.описание.length > 100 ? item.описание.substring(0, 100) + '...' : item.описание) : ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRaces() {
        let races = this.db.getRaces();

        // Применение поискового запроса
        if (this.searchQuery && this.searchQuery.length >= 2) {
            const lowerQuery = this.searchQuery.toLowerCase();
            races = races.filter(race => {
                const name = (race.название || '').toLowerCase();
                const description = (race.описание || '').toLowerCase();
                return name.includes(lowerQuery) || 
                       description.includes(lowerQuery);
            });
        }

        return `
            <div class="spellbook__monsters-grid">
                ${races.map(race => {
                    const bonuses = [];
                    if (race.бонус_силы) bonuses.push(`+${race.бонус_силы} Сил`);
                    if (race.бонус_ловкости) bonuses.push(`+${race.бонус_ловкости} Лов`);
                    if (race.бонус_телосложения) bonuses.push(`+${race.бонус_телосложения} Тел`);
                    if (race.бонус_интеллекта) bonuses.push(`+${race.бонус_интеллекта} Инт`);
                    if (race.бонус_мудрости) bonuses.push(`+${race.бонус_мудрости} Муд`);
                    if (race.бонус_харизмы) bonuses.push(`+${race.бонус_харизмы} Хар`);
                    
                    return `
                        <div class="race-card" data-race-id="${race.id}">
                            <img src="${race.фото || 'src/img/races/human.png'}" 
                                 alt="${race.название}" 
                                 loading="lazy"
                                 onerror="this.src='./src/img/races/human.png'">
                            <div class="card-content">
                                <h3>${race.название}</h3>
                                <p class="race-description">${race.описание ? (race.описание.length > 100 ? race.описание.substring(0, 100) + '...' : race.описание) : ''}</p>
                                <div class="stats">
                                    <div class="stat">
                                        <span class="stat-label">Скорость:</span>
                                        <span>${race.скорость} фт</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">Размер:</span>
                                        <span>${race.размер}</span>
                                    </div>
                                </div>
                                ${bonuses.length > 0 ? `<div class="bonuses">${bonuses.join(', ')}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderClasses() {
        let classes = this.db.getClasses();

        // Применение поискового запроса
        if (this.searchQuery && this.searchQuery.length >= 2) {
            const lowerQuery = this.searchQuery.toLowerCase();
            classes = classes.filter(cls => {
                const name = (cls.название || '').toLowerCase();
                const description = (cls.описание || '').toLowerCase();
                return name.includes(lowerQuery) || 
                       description.includes(lowerQuery);
            });
        }

        return `
            <div class="spellbook__monsters-grid">
                ${classes.map(cls => `
                    <div class="class-card" data-class-id="${cls.id}">
                        <img src="${cls.фото || 'src/img/classes/fighter.png'}" 
                             alt="${cls.название}" 
                             loading="lazy"
                             onerror="this.src='./src/img/classes/fighter.png'">
                        <div class="card-content">
                            <h3>${cls.название}</h3>
                            <p class="class-description">${cls.описание ? (cls.описание.length > 100 ? cls.описание.substring(0, 100) + '...' : cls.описание) : ''}</p>
                            <div class="stats">
                                <div class="stat">
                                    <span class="stat-label">Хиты:</span>
                                    <span>${cls.хиты_за_уровень}</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-label">Спасброски:</span>
                                    <span>${cls.спасительные_броски.join(', ')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    closeEntityModal(modalOverlay) {
        if (!modalOverlay) return;
        modalOverlay.classList.remove('active');
        modalOverlay.style.setProperty('display', 'none', 'important');
        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.remove();
            }
        }, 300);
    }
}

