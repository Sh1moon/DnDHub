class CharacterManager {
    constructor(database, auth) {
        this.db = database;
        this.auth = auth;
        this.currentStep = 1;
        this.characterData = {
            userId: null,
            raceId: null,
            classId: null,
            stats: {
                сила: 8,
                ловкость: 8,
                телосложение: 8,
                интеллект: 8,
                мудрость: 8,
                харизма: 8
            },
            equipment: [],
            level: 1,
            name: '',
            background: ''
        };
    }

    init() {
        if (!this.auth.isAuthenticated()) {
            return;
        }
        this.characterData.userId = this.auth.currentUser.id;
        this.renderStep(this.currentStep);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Навигация по шагам
        document.querySelectorAll('.step').forEach(step => {
            step.addEventListener('click', (e) => {
                const stepNum = parseInt(e.target.dataset.step);
                if (stepNum <= this.currentStep) {
                    this.goToStep(stepNum);
                }
            });
        });

        // Кнопки навигации
        const nextBtn = document.getElementById('nextStep');
        const prevBtn = document.getElementById('prevStep');
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());
    }

    goToStep(step) {
        this.currentStep = step;
        this.renderStep(step);
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < 4) {
                this.currentStep++;
                this.renderStep(this.currentStep);
            } else {
                this.saveCharacter();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.renderStep(this.currentStep);
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                if (!this.characterData.raceId) {
                    this.showError('Выберите расу');
                    return false;
                }
                break;
            case 2:
                if (!this.characterData.classId) {
                    this.showError('Выберите класс');
                    return false;
                }
                break;
            case 3:
                const totalPoints = Object.values(this.characterData.stats).reduce((a, b) => a + b, 0);
                if (totalPoints !== 72) { // Стандартный массив: 15, 14, 13, 12, 10, 8 = 72
                    this.showError('Некорректное распределение характеристик');
                    return false;
                }
                break;
        }
        return true;
    }

    renderStep(step) {
        // Обновление активного шага
        document.querySelectorAll('.step').forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.step) === step);
        });

        // Рендеринг контента шага
        const container = document.getElementById('characterCreatorContent');
        if (!container) return;

        switch (step) {
            case 1:
                this.renderRaceSelection(container);
                break;
            case 2:
                this.renderClassSelection(container);
                break;
            case 3:
                this.renderStatsDistribution(container);
                break;
            case 4:
                this.renderEquipmentSelection(container);
                break;
        }
    }

    renderRaceSelection(container) {
        const races = this.db.getRaces();
        container.innerHTML = `
            <div class="race-selection">
                ${races.map(race => {
                    const bonuses = [];
                    if (race.бонус_силы) bonuses.push(`+${race.бонус_силы} Сил`);
                    if (race.бонус_ловкости) bonuses.push(`+${race.бонус_ловкости} Лов`);
                    if (race.бонус_телосложения) bonuses.push(`+${race.бонус_телосложения} Тел`);
                    if (race.бонус_интеллекта) bonuses.push(`+${race.бонус_интеллекта} Инт`);
                    if (race.бонус_мудрости) bonuses.push(`+${race.бонус_мудрости} Муд`);
                    if (race.бонус_харизмы) bonuses.push(`+${race.бонус_харизмы} Хар`);
                    
                    return `
                        <div class="race-card ${this.characterData.raceId === race.id ? 'selected' : ''}" 
                             data-race-id="${race.id}">
                            <img src="${race.фото || 'src/img/races/human.png'}" 
                                 alt="${race.название}" 
                                 onerror="this.src='./src/img/races/human.png'">
                            <div class="card-content">
                                <h3>${race.название}</h3>
                                <p class="race-description">${race.описание ? (race.описание.length > 100 ? race.описание.substring(0, 100) + '...' : race.описание) : ''}</p>
                                <div class="stats">
                                    <div class="stat">
                                        <span class="stat-label">Скорость:</span>
                                        <span>${race.скорость || 'N/A'} фт</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">Размер:</span>
                                        <span>${race.размер || 'N/A'}</span>
                                    </div>
                                </div>
                                ${bonuses.length > 0 ? `<div class="bonuses">${bonuses.join(', ')}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.querySelectorAll('.race-card').forEach(card => {
            card.addEventListener('click', () => {
                this.characterData.raceId = parseInt(card.dataset.raceId);
                this.renderRaceSelection(container);
            });
        });
    }

    getRaceBonuses(race) {
        const bonuses = [];
        const statMap = {
            'бонус_силы': 'Сила',
            'бонус_ловкости': 'Ловкость',
            'бонус_телосложения': 'Телосложение',
            'бонус_интеллекта': 'Интеллект',
            'бонус_мудрости': 'Мудрость',
            'бонус_харизмы': 'Харизма'
        };

        Object.keys(statMap).forEach(key => {
            if (race[key] && race[key] > 0) {
                bonuses.push(`+${race[key]} к ${statMap[key]}`);
            }
        });

        return bonuses;
    }

    renderClassSelection(container) {
        const classes = this.db.getClasses();
        container.innerHTML = `
            <div class="class-selection">
                ${classes.map(cls => `
                    <div class="class-card ${this.characterData.classId === cls.id ? 'selected' : ''}" 
                         data-class-id="${cls.id}">
                        <img src="${cls.фото || 'src/img/classes/fighter.png'}" 
                             alt="${cls.название}" 
                             onerror="this.src='./src/img/classes/fighter.png'">
                        <div class="card-content">
                            <h3>${cls.название}</h3>
                            <p class="class-description">${cls.описание ? (cls.описание.length > 100 ? cls.описание.substring(0, 100) + '...' : cls.описание) : ''}</p>
                            <div class="stats">
                                <div class="stat">
                                    <span class="stat-label">Хиты:</span>
                                    <span>${cls.хиты_за_уровень || 'N/A'}</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-label">Спасброски:</span>
                                    <span>${cls.спасительные_броски ? cls.спасительные_броски.join(', ') : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        container.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', () => {
                this.characterData.classId = parseInt(card.dataset.classId);
                // Автоматически распределяем характеристики при выборе класса
                this.autoAssignStats();
                this.renderClassSelection(container);
                // Показываем уведомление
                if (window.UI) {
                    window.UI.showNotification('Характеристики автоматически распределены для выбранного класса', 'success');
                }
            });
        });
    }

    autoAssignStats() {
        // Стандартные массивы для классов согласно правилам D&D 5e
        // Эти значения уже оптимизированы для каждого класса
        const classStats = {
            1: { сила: 15, ловкость: 14, телосложение: 13, интеллект: 8, мудрость: 10, харизма: 12 }, // Воин
            2: { сила: 8, ловкость: 12, телосложение: 13, интеллект: 15, мудрость: 14, харизма: 10 }, // Волшебник
            3: { сила: 12, ловкость: 15, телосложение: 13, интеллект: 14, мудрость: 10, харизма: 8 }, // Плут
            4: { сила: 8, ловкость: 14, телосложение: 12, интеллект: 13, мудрость: 10, харизма: 15 }, // Бард
            5: { сила: 15, ловкость: 13, телосложение: 14, интеллект: 10, мудрость: 12, харизма: 8 }, // Варвар
            6: { сила: 8, ловкость: 12, телосложение: 14, интеллект: 13, мудрость: 15, харизма: 10 }, // Друид
            7: { сила: 10, ловкость: 13, телосложение: 14, интеллект: 8, мудрость: 12, харизма: 15 }, // Чародей
            8: { сила: 12, ловкость: 15, телосложение: 13, интеллект: 8, мудрость: 14, харизма: 10 }, // Следопыт
            9: { сила: 15, ловкость: 10, телосложение: 13, интеллект: 8, мудрость: 12, харизма: 14 }, // Паладин
            10: { сила: 12, ловкость: 15, телосложение: 13, интеллект: 10, мудрость: 14, харизма: 8 }, // Монах
            11: { сила: 8, ловкость: 14, телосложение: 13, интеллект: 12, мудрость: 10, харизма: 15 }, // Колдун
            12: { сила: 8, ловкость: 14, телосложение: 13, интеллект: 12, мудрость: 10, харизма: 15 }, // Изобретатель
            13: { сила: 14, ловкость: 8, телосложение: 13, интеллект: 10, мудрость: 15, харизма: 12 }  // Жрец
        };

        if (this.characterData.classId && classStats[this.characterData.classId]) {
            // Применяем стандартный массив для класса
            this.characterData.stats = { ...classStats[this.characterData.classId] };
        }
    }

    renderStatsDistribution(container) {
        const race = this.db.getRaceById(this.characterData.raceId);
        container.innerHTML = `
            <div class="stats-distribution">
                <h3>Распределение характеристик</h3>
                <p>Используйте стандартный массив: 15, 14, 13, 12, 10, 8 (всего 72 очка)</p>
                ${Object.keys(this.characterData.stats).map(stat => {
                    const value = this.characterData.stats[stat];
                    const raceBonus = race ? (race[`бонус_${stat}`] || 0) : 0;
                    const total = value + raceBonus;
                    const modifier = Math.floor((total - 10) / 2);
                    return `
                        <div class="stat-row">
                            <div class="stat-name">${this.getStatName(stat)}</div>
                            <div class="stat-controls">
                                <button class="stat-decrease" data-stat="${stat}">-</button>
                                <input type="number" class="stat-input" data-stat="${stat}" 
                                       value="${value}" min="8" max="15">
                                <button class="stat-increase" data-stat="${stat}">+</button>
                            </div>
                            <div class="stat-value">${total} ${raceBonus > 0 ? `(+${raceBonus})` : ''}</div>
                            <div class="stat-modifier">${modifier >= 0 ? '+' : ''}${modifier}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.querySelectorAll('.stat-increase').forEach(btn => {
            btn.addEventListener('click', () => {
                const stat = btn.dataset.stat;
                if (this.characterData.stats[stat] < 15) {
                    this.characterData.stats[stat]++;
                    this.renderStatsDistribution(container);
                }
            });
        });

        container.querySelectorAll('.stat-decrease').forEach(btn => {
            btn.addEventListener('click', () => {
                const stat = btn.dataset.stat;
                if (this.characterData.stats[stat] > 8) {
                    this.characterData.stats[stat]--;
                    this.renderStatsDistribution(container);
                }
            });
        });

        container.querySelectorAll('.stat-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const stat = e.target.dataset.stat;
                const value = parseInt(e.target.value);
                if (value >= 8 && value <= 15) {
                    this.characterData.stats[stat] = value;
                    this.renderStatsDistribution(container);
                }
            });
        });
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

    renderEquipmentSelection(container) {
        const items = this.db.getItems();
        container.innerHTML = `
            <div class="equipment-selection">
                <h3>Выберите начальное снаряжение</h3>
                <div class="equipment-grid">
                    ${items.map(item => {
                        const photoPath = item.фото || `./src/img/items/${item.id || 'default'}.png`;
                        return `
                        <div class="equipment-item ${this.characterData.equipment.includes(item.id) ? 'selected' : ''}" 
                             data-item-id="${item.id}">
                            <img src="${photoPath}" 
                                 alt="${item.название}" 
                                 onerror="this.src='./src/img/items/default.png'">
                            <div class="card-content">
                                <h3>${item.название}</h3>
                                <p class="item-description">${item.описание ? (item.описание.length > 100 ? item.описание.substring(0, 100) + '...' : item.описание) : ''}</p>
                                <div class="stats">
                                    <div class="stat">
                                        <span class="stat-label">Тип:</span>
                                        <span>${item.тип || 'N/A'}</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">Редкость:</span>
                                        <span>${item.редкость || 'N/A'}</span>
                                    </div>
                                </div>
                                ${item.стоимость ? `<div class="bonuses">${item.стоимость}</div>` : ''}
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
                <div class="character-name-input">
                    <label>Имя персонажа:</label>
                    <input type="text" id="characterName" value="${this.characterData.name}" 
                           placeholder="Введите имя персонажа">
                </div>
            </div>
        `;

        container.querySelectorAll('.equipment-item').forEach(item => {
            item.addEventListener('click', () => {
                const itemId = parseInt(item.dataset.itemId);
                const index = this.characterData.equipment.indexOf(itemId);
                if (index > -1) {
                    this.characterData.equipment.splice(index, 1);
                } else {
                    this.characterData.equipment.push(itemId);
                }
                this.renderEquipmentSelection(container);
            });
        });

        const nameInput = document.getElementById('characterName');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.characterData.name = e.target.value;
            });
        }
    }

    saveCharacter() {
        if (!this.characterData.name) {
            this.showError('Введите имя персонажа');
            return;
        }

        const race = this.db.getRaceById(this.characterData.raceId);
        const classData = this.db.getClassById(this.characterData.classId);

        // Расчет финальных характеристик с бонусами расы
        const finalStats = {};
        Object.keys(this.characterData.stats).forEach(stat => {
            const base = this.characterData.stats[stat];
            const bonus = race[`бонус_${stat}`] || 0;
            finalStats[stat] = base + bonus;
        });

        const character = {
            ...this.characterData,
            stats: finalStats,
            race: race,
            class: classData,
            createdAt: new Date().toISOString()
        };

        this.db.createCharacter(character);
        this.showSuccess('Персонаж успешно создан!');
        
        // Сброс формы
        setTimeout(() => {
            this.currentStep = 1;
            this.characterData = {
                userId: this.auth.currentUser.id,
                raceId: null,
                classId: null,
                stats: {
                    сила: 8,
                    ловкость: 8,
                    телосложение: 8,
                    интеллект: 8,
                    мудрость: 8,
                    харизма: 8
                },
                equipment: [],
                level: 1,
                name: '',
                background: ''
            };
            this.renderStep(1);
        }, 2000);
    }

    showError(message) {
        // Используем UI компонент для показа ошибок
        if (window.UI) {
            window.UI.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (window.UI) {
            window.UI.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }
}

