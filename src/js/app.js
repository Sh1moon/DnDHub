// Инициализация приложения
class App {
    constructor() {
        this.db = new Database();
        this.auth = new Auth(this.db);
        this.characterManager = null;
        this.characterList = null;
        this.roomManager = null;
        this.spellbook = null;
        this.adminPanel = null;
        this.campaignGame = null;
        this.currentRoute = 'home';
        this.authMode = false;
        
        // Слушаем обновления базы данных
        window.addEventListener('databaseUpdated', () => {
            // Перезагружаем данные в модулях
            if (this.spellbook) {
                this.spellbook.render();
            }
        });
    }

    init() {
        // Инициализация UI
        if (window.UI) {
            window.UI.init();
        }

        // Настройка роутинга
        this.setupRouting();

        // Обновление меню пользователя
        this.updateUserMenu();

        // Настройка модального окна авторизации
        this.setupAuthModal();

        // Рендер начальной страницы
        this.render();
    }

    setupAuthModal() {
        // Модальное окно уже есть в HTML, просто привязываем обработчики
        const modal = document.getElementById('authModal');
        if (!modal) return;

        // Проверяем, не были ли уже привязаны обработчики
        if (modal.dataset.initialized === 'true') return;
        modal.dataset.initialized = 'true';

        const closeBtn = document.getElementById('closeAuthModal');
        const authSwitch = document.getElementById('authSwitch');
        const authForm = document.getElementById('authForm');

        // Обработчик закрытия
        if (closeBtn) {
            closeBtn.onclick = () => {
                this.hideAuthModal();
            };
        }

        // Закрытие при клике на overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideAuthModal();
            }
        });

        // Обработчик переключения режима
        if (authSwitch) {
            authSwitch.onclick = (e) => {
                e.preventDefault();
                this.toggleAuthMode();
            };
        }

        // Обработчик отправки формы
        if (authForm) {
            authForm.onsubmit = (e) => {
                e.preventDefault();
                this.handleAuth();
                return false;
            };
        }
    }

    showAuthModal(isRegister = false) {
        const modal = document.getElementById('authModal');
        if (!modal) return;
        
        const title = document.getElementById('authModalTitle');
        const switchText = document.getElementById('authSwitchText');
        const switchLink = document.getElementById('authSwitch');
        const submitBtn = document.getElementById('submitBtn');
        const submitBtnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
        const nameInputGroup = document.getElementById('nameInputGroup');
        const nameInput = document.getElementById('nameInput');
        const passwordToggle = document.getElementById('passwordToggle');
        const passwordInput = document.getElementById('password');
        const forgotPasswordLink = document.getElementById('forgotPassword');

        // Настройка переключения видимости пароля
        if (passwordToggle && passwordInput) {
            passwordToggle.onclick = () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                passwordToggle.textContent = type === 'password' ? '👁' : '🙈';
            };
        }

        // Обработчик "Забыли пароль"
        if (forgotPasswordLink) {
            forgotPasswordLink.onclick = (e) => {
                e.preventDefault();
                if (window.UI) {
                    window.UI.showNotification('Функция восстановления пароля пока не реализована', 'info');
                }
            };
        }

        const subtitle = document.getElementById('authModalSubtitle');
        
        if (isRegister) {
            if (title) title.textContent = 'Создать аккаунт';
            if (subtitle) subtitle.textContent = 'Присоединяйтесь к нашему сообществу!';
            if (switchText) switchText.textContent = 'Уже есть аккаунт? ';
            if (switchLink) switchLink.textContent = 'Войти';
            if (submitBtnText) submitBtnText.textContent = 'Зарегистрироваться';
            else if (submitBtn) submitBtn.textContent = 'Зарегистрироваться';
            if (nameInputGroup) nameInputGroup.style.display = 'flex';
            if (nameInput) nameInput.required = true;
            // Убеждаемся, что поле пароля видимо и обязательно
            if (passwordInput) {
                passwordInput.required = true;
                const passwordGroup = document.getElementById('passwordGroup');
                if (passwordGroup) {
                    passwordGroup.style.display = 'flex';
                }
                passwordInput.setAttribute('autocomplete', 'new-password');
            }
            const rememberMeGroup = document.getElementById('rememberMeGroup');
            if (rememberMeGroup) rememberMeGroup.style.display = 'none';
            if (forgotPasswordLink && forgotPasswordLink.parentElement) {
                forgotPasswordLink.parentElement.style.display = 'none';
            }
        } else {
            if (title) title.textContent = 'Вход в аккаунт';
            if (subtitle) subtitle.textContent = 'Добро пожаловать обратно!';
            if (switchText) switchText.textContent = 'У меня нет аккаунта. ';
            if (switchLink) switchLink.textContent = 'Зарегистрироваться';
            if (submitBtnText) submitBtnText.textContent = 'Войти';
            else if (submitBtn) submitBtn.textContent = 'Войти';
            if (nameInputGroup) nameInputGroup.style.display = 'none';
            if (nameInput) {
                nameInput.required = false;
                nameInput.value = '';
            }
            // Убеждаемся, что поле пароля видимо и обязательно
            if (passwordInput) {
                passwordInput.required = true;
                const passwordGroup = document.getElementById('passwordGroup');
                if (passwordGroup) {
                    passwordGroup.style.display = 'flex';
                }
                passwordInput.setAttribute('autocomplete', 'current-password');
            }
            const rememberMeGroup = document.getElementById('rememberMeGroup');
            if (rememberMeGroup) rememberMeGroup.style.display = 'flex';
            if (forgotPasswordLink && forgotPasswordLink.parentElement) {
                forgotPasswordLink.parentElement.style.display = 'block';
            }
        }

        // Сбрасываем форму и ошибки
        const form = document.getElementById('authForm');
        if (form) {
            form.reset();
            // Очищаем ошибки
            document.querySelectorAll('.form-error').forEach(error => {
                error.classList.remove('active');
                error.textContent = '';
            });
            // Сбрасываем видимость пароля
            if (passwordInput) {
                passwordInput.setAttribute('type', 'password');
                passwordInput.required = true;
                const passwordGroup = document.getElementById('passwordGroup');
                if (passwordGroup) {
                    passwordGroup.style.display = 'flex';
                }
                // Устанавливаем правильный autocomplete
                if (this.authMode) {
                    passwordInput.setAttribute('autocomplete', 'new-password');
                } else {
                    passwordInput.setAttribute('autocomplete', 'current-password');
                }
                if (passwordToggle) passwordToggle.textContent = '👁';
            }
        }

        modal.classList.add('active');
        modal.style.setProperty('display', 'flex', 'important');
        this.authMode = isRegister;
    }

    hideAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.setProperty('display', 'none', 'important');
            const form = document.getElementById('authForm');
            if (form) {
                form.reset();
            }
            // Скрываем поле имени
            const nameInputGroup = document.getElementById('nameInputGroup');
            if (nameInputGroup) {
                nameInputGroup.style.display = 'none';
            }
        }
    }

    toggleAuthMode() {
        this.showAuthModal(!this.authMode);
    }

    handleAuth() {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (!usernameInput || !passwordInput) {
            if (window.UI) {
                window.UI.showNotification('Ошибка: поля формы не найдены', 'error');
            }
            return;
        }
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (this.authMode) {
            // Регистрация
            const nameInput = document.getElementById('nameInput');
            const name = nameInput ? nameInput.value.trim() : '';
            // Проверяем, является ли username email
            const isEmail = username.includes('@');
            const email = isEmail ? username.trim() : `${username.trim()}@dndhub.local`;
            
            // Валидация
            if (!name || name.length < 2) {
                const nameError = document.getElementById('nameError');
                if (nameError) {
                    nameError.textContent = 'Имя должно содержать минимум 2 символа';
                    nameError.classList.add('active');
                }
                return;
            }
            
            if (!password || password.length < 6) {
                const passwordError = document.getElementById('passwordError');
                if (passwordError) {
                    passwordError.textContent = 'Пароль должен содержать минимум 6 символов';
                    passwordError.classList.add('active');
                }
                if (window.UI) {
                    window.UI.showNotification('Пароль должен содержать минимум 6 символов', 'error');
                }
                return;
            }
            
            const result = this.auth.register({
                email: email,
                password: password,
                confirmPassword: password,
                name: name
            });

            if (result.success) {
                if (window.UI) {
                    window.UI.showNotification('Регистрация успешна! Добро пожаловать!', 'success');
                }
                this.hideAuthModal();
                this.updateUserMenu();
                // Перенаправляем на главную
                window.location.hash = '#home';
                this.render();
            } else {
                // Показываем ошибки в форме
                result.errors.forEach((error, index) => {
                    if (index === 0 && error.includes('email')) {
                        const usernameError = document.getElementById('usernameError');
                        if (usernameError) {
                            usernameError.textContent = error;
                            usernameError.classList.add('active');
                        }
                    } else if (index === 0 && error.includes('пароль')) {
                        const passwordError = document.getElementById('passwordError');
                        if (passwordError) {
                            passwordError.textContent = error;
                            passwordError.classList.add('active');
                        }
                    } else if (index === 0 && error.includes('имя')) {
                        const nameError = document.getElementById('nameError');
                        if (nameError) {
                            nameError.textContent = error;
                            nameError.classList.add('active');
                        }
                    }
                });
                if (window.UI) {
                    window.UI.showNotification(result.errors[0] || 'Ошибка регистрации', 'error');
                }
            }
        } else {
            // Вход - username может быть email или именем
            const isEmail = username.includes('@');
            let result;
            
            if (isEmail) {
                result = this.auth.login(username, password);
            } else {
                // Ищем пользователя по имени
                const users = this.db.getData('users') || [];
                const user = users.find(u => u.name === username || u.email === `${username}@dndhub.local`);
                if (user) {
                    result = this.auth.login(user.email, password);
                } else {
                    result = { success: false, errors: ['Пользователь не найден'] };
                }
            }
            
            if (result.success) {
                if (window.UI) {
                    window.UI.showNotification('Успешный вход!', 'success');
                }
                this.hideAuthModal();
                this.updateUserMenu();
            } else {
                if (window.UI) {
                    window.UI.showNotification(result.errors[0] || 'Ошибка входа', 'error');
                }
            }
        }
    }

    setupProtectedLinks() {
        document.querySelectorAll('.protected-link').forEach(link => {
            link.addEventListener('click', (e) => {
                if (!this.auth.isAuthenticated()) {
                    e.preventDefault();
                    this.showAuthModal(false);
                }
            });
        });

        // Обработка кликов по логотипу
        document.querySelectorAll('.logo[data-route]').forEach(logo => {
            logo.addEventListener('click', (e) => {
                const route = logo.dataset.route;
                if (route) {
                    window.location.hash = route;
                    this.render();
                }
            });
        });
    }

    setupRouting() {
        // Обработка хеша URL
        window.addEventListener('hashchange', () => {
            this.render();
        });

        // Обработка кликов по навигации
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-route]')) {
                e.preventDefault();
                const route = e.target.dataset.route;
                window.location.hash = route;
                this.render();
            }
        });
    }

    render() {
        // Определение текущего маршрута
        const hash = window.location.hash.slice(1) || 'home';
        this.currentRoute = hash;

        // Проверка авторизации для защищенных страниц
        const hashBase = hash.split('?')[0]; // Берем только базовую часть hash без параметров
        const protectedRoutes = ['character-creator', 'rooms', 'spellbook', 'admin', 'characters', 'campaign'];
        if (protectedRoutes.includes(hashBase) && !this.auth.isAuthenticated()) {
            window.location.hash = '#home';
            this.showAuthModal(false);
            if (window.UI) {
                window.UI.showNotification('Необходима авторизация для доступа к этой странице', 'error');
            }
            return;
        }

        // Обновление навигации
        this.updateNavigation();

        // Рендер контента
        const container = document.getElementById('appContent');
        if (!container) return;

        switch (hashBase) {
            case 'home':
                this.renderHome(container);
                break;
            case 'character-creator':
                this.renderCharacterCreator(container);
                break;
            case 'rooms':
                this.renderRooms(container);
                break;
            case 'campaign':
                this.renderCampaign(container);
                break;
            case 'spellbook':
                this.renderSpellbook(container);
                break;
            case 'admin':
                this.renderAdmin(container);
                break;
            case 'characters':
                this.renderCharacters(container);
                break;
            case 'login':
                this.renderLogin(container);
                break;
            case 'register':
                this.renderRegister(container);
                break;
            default:
                this.renderHome(container);
        }
    }

    updateNavigation() {
        document.querySelectorAll('[data-route]').forEach(link => {
            link.classList.toggle('active', link.dataset.route === this.currentRoute);
        });
    }

    renderHome(container) {
        container.innerHTML = `
            <!-- Слайдер -->
            <section class="slider">
                <button class="slider-arrow slider-prev" id="sliderPrev">
                    <img src="src/img/slideArrow.svg" alt="Стрелка влево" style="width:174px">
                </button>
                <div class="slider__inner">
                    <div class="slider__content active">
                        <h2 class="slider__txt">Твори</h2>
                        <img src="src/img/tvori.png" alt="Твори" class="slider__img">
                    </div>
                    <div class="slider__content">
                        <h2 class="slider__txt">Играй</h2>
                        <img src="src/img/Play.png" alt="Играй" class="slider__img">
                    </div>
                    <div class="slider__content">
                        <h2 class="slider__txt">Изучай</h2>
                        <img src="src/img/Izuchay.png" alt="Изучай" class="slider__img">
                    </div>
                </div>
                <button class="slider-arrow slider-next" id="sliderNext">
                    <img src="src/img/slideArrow.svg" alt="Стрелка вправо" style="width:174px;transform:rotate(180deg)">
                </button>
            </section>

            <!-- Контент -->
            <main class="container">
                <section class="content-section">
                    <h2 class="section-title">Dungeon Master's Hub — это больше чем приложение, это страсть к миру D&D</h2>
                    <p class="section-text">
                        Как мастер игры и разработчик в одном лице, я столкнулся с проблемой: не существует удобного русскоязычного инструмента для проведения онлайн-сессий D&D. Разрозненные таблицы, десятки вкладок с правилами, сложная синхронизация между игроками — всё это мешало погружению в игру. Я решил создать решение, которое объединит всё необходимое в одном месте — от базы правил до инструментов коммуникации, с акцентом на простоту и удобство для русскоязычного комьюнити.
                    </p>
                </section>
                <section class="content-section">
                    <h2 class="section-title">Что такое Dungeons & Dragons?</h2>
                    <p class="section-text">
                        Dungeons & Dragons — это больше чем настольная игра. Это врата в мир фэнтези, где вы становитесь героем собственной саги. Здесь книга правил превращается в живую историю, написанную совместно мастером и игроками. Каждый бросок кубиков — это поворот сюжета, каждое решение персонажа — новая глава в эпическом повествовании. Вы можете быть могучим воином, хитрым плутом или могущественным волшебником, но главное — вы будете тем, кем захотите. Это пространство для творчества, где воображение не знает границ, а дружба и приключения становятся реальностью.
                    </p>
                </section>
                <section class="content-section">
                    <h2 class="section-title">Как работает наша платформа?</h2>
                    <p class="section-text">
                        Dungeon Master's Hub создан специально для русскоязычных поклонников D&D. Мы объединили все необходимое для игры в одном месте — от полной базы правил до удобных инструментов для ведения кампаний. Создавайте персонажей в интуитивном редакторе, храните заметки в организованном пространстве, общайтесь с игроками через встроенную систему сообщений. Наша платформа отслеживает состояние персонажей и предоставляет мгновенный доступ к любой информации из правил. Теперь вы можете сосредоточиться на самом важном — игре.
                    </p>
                </section>
            </main>

            <!-- Футер -->
            <footer class="footer">
                <img src="src/img/corner.svg" alt="" class="cornerLeft">
                <div class="footer__content">
                    <ul class="footer__list">
                        <a href="#spellbook" class="txt link protected-link" data-route="spellbook"><li class="footer__item">Играть</li></a>
                        <a href="#character-creator" class="txt link protected-link" data-route="character-creator"><li class="footer__item">Создать персонажа</li></a>
                        <a href="#rooms" class="txt link protected-link" data-route="rooms"><li class="footer__item">Создать комнату</li></a>
                    </ul>
                    <a href="#home" data-route="home"><img src="src/img/logo.svg" alt="Логотип" style="width: 13rem"></a>
                    <div class="social">
                        <a href="#">
                            <img src="src/img/telegram.svg" alt="Telegram" class="logo">
                        </a>
                        <a href="#">
                            <img src="src/img/vk.svg" alt="VK" class="logo">
                        </a>
                        <a href="#">
                            <img src="src/img/whatsapp.svg" alt="WhatsApp" class="logo">
                        </a>
                    </div>
                </div>
                <img src="src/img/corner.svg" alt="" class="cornerRight">
            </footer>
        `;
        this.initSlider();
        this.setupProtectedLinks();
    }

    initSlider() {
        const prevBtn = document.getElementById('sliderPrev');
        const nextBtn = document.getElementById('sliderNext');
        const contents = document.querySelectorAll('.slider__content');
        let currentIndex = 0;

        if (!prevBtn || !nextBtn || contents.length === 0) return;

        const showSlide = (index) => {
            contents.forEach((content, i) => {
                content.classList.remove('active', 'prev', 'next');
                if (i === index) {
                    content.classList.add('active');
                } else if (i < index) {
                    content.classList.add('prev');
                } else {
                    content.classList.add('next');
                }
            });

            prevBtn.disabled = index === 0;
            nextBtn.disabled = index === contents.length - 1;
        };

        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                showSlide(currentIndex);
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentIndex < contents.length - 1) {
                currentIndex++;
                showSlide(currentIndex);
            }
        });

        showSlide(0);
    }

    renderCharacterCreator(container) {
        if (!this.auth.isAuthenticated()) {
            container.innerHTML = `
                <div class="section">
                    <h2>Необходима авторизация</h2>
                    <p>Пожалуйста, войдите в систему для создания персонажа.</p>
                    <a href="#login" data-route="login">Войти</a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="character-creator">
                <div class="creation-steps">
                    <div class="step active" data-step="1">Раса</div>
                    <div class="step" data-step="2">Класс</div>
                    <div class="step" data-step="3">Характеристики</div>
                    <div class="step" data-step="4">Снаряжение</div>
                </div>
                <div id="characterCreatorContent"></div>
                <div class="form-actions">
                    <button id="prevStep" class="btn-secondary">Назад</button>
                    <button id="nextStep" class="btn-primary">Далее</button>
                </div>
            </div>
        `;

        if (!this.characterManager) {
            this.characterManager = new CharacterManager(this.db, this.auth);
        }
        this.characterManager.init();
    }

    renderRooms(container) {
        if (!this.auth.isAuthenticated()) {
            container.innerHTML = `
                <div class="section">
                    <h2>Необходима авторизация</h2>
                    <p>Пожалуйста, войдите в систему для управления комнатами.</p>
                    <a href="#login" data-route="login">Войти</a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="room-manager">
                <div class="room-manager__header">
                    <h2>Игровые комнаты</h2>
                    <button class="btn-primary" id="createRoomBtn">Создать комнату</button>
                </div>
                <div id="roomsList"></div>
                <div id="roomInterface" style="display: none;"></div>
            </div>
        `;

        if (!this.roomManager) {
            this.roomManager = new RoomManager(this.db, this.auth);
        }
        this.roomManager.init();
    }

    renderSpellbook(container) {
        container.innerHTML = `
            <div style="display: flex;">
                <aside class="aside">
                    <a href="#home" class="aside__back" data-route="home">
                        <img src="src/img/back.svg" alt="Назад">
                    </a>
                    <div class="aside__btns">
                        <ul class="aside__list">
                            <a href="#rooms" data-route="rooms">
                                <li class="aside__items">
                                    <img src="src/img/logo.svg" alt="Кампании" style="width: 94px">
                                    <p class="txt hidden link">Кампании</p>
                                </li>
                            </a>
                            <li class="aside__items aside__active">
                                <img src="src/img/directory.svg" alt="Справочник">
                                <p class="txt hidden">Справочник</p>
                            </li>
                            <li class="aside__items">
                                <img src="src/img/friends.svg" alt="Друзья">
                                <p class="txt hidden">Друзья</p>
                            </li>
                        </ul>
                    </div>
                </aside>
                <div style="flex: 1; padding: 2rem;">
                    <div id="spellbookContent"></div>
                </div>
            </div>
        `;

        if (!this.spellbook) {
            this.spellbook = new Spellbook(this.db);
        }
        this.spellbook.init();
        this.setupProtectedLinks();
        
        // Добавляем кнопку обновления базы данных (только для разработки)
        const spellbookContent = document.getElementById('spellbookContent');
        if (spellbookContent && this.auth.isAdmin()) {
            const updateBtn = document.createElement('button');
            updateBtn.className = 'btn btn-primary';
            updateBtn.textContent = 'Обновить базу данных из DB.json';
            updateBtn.style.marginBottom = '1rem';
            updateBtn.onclick = async () => {
                updateBtn.disabled = true;
                updateBtn.textContent = 'Обновление...';
                const success = await this.db.updateFromDBJson();
                if (success) {
                    if (window.UI) {
                        window.UI.showNotification('База данных обновлена!', 'success');
                    }
                    this.spellbook.render();
                } else {
                    if (window.UI) {
                        window.UI.showNotification('Ошибка обновления базы данных', 'error');
                    }
                }
                updateBtn.disabled = false;
                updateBtn.textContent = 'Обновить базу данных из DB.json';
            };
            spellbookContent.insertBefore(updateBtn, spellbookContent.firstChild);
        }
    }

    renderAdmin(container) {
        if (!this.auth.isAdmin()) {
            container.innerHTML = `
                <div class="section">
                    <h2>Доступ запрещен</h2>
                    <p>У вас нет прав доступа к админ панели.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div id="adminPanel"></div>
        `;

        if (!this.adminPanel) {
            this.adminPanel = new AdminPanel(this.db, this.auth);
        }
        this.adminPanel.init();
    }

    renderCharacters(container) {
        if (!this.characterList) {
            this.characterList = new CharacterList(this.db, this.auth);
        }
        this.characterList.renderCharactersList(container);
        this.setupProtectedLinks();
    }

    renderLogin(container) {
        // Используем модальное окно вместо отдельной страницы
        this.showAuthModal(false);
        window.location.hash = '#home';
    }

    renderRegister(container) {
        // Используем модальное окно вместо отдельной страницы
        this.showAuthModal(true);
        window.location.hash = '#home';
    }

    renderCampaign(container) {
        // Получаем ID комнаты из hash (например: #campaign?roomId=123)
        const hashParts = window.location.hash.split('?');
        const urlParams = new URLSearchParams(hashParts[1] || '');
        const roomId = parseInt(urlParams.get('roomId'));

        if (!roomId || isNaN(roomId)) {
            if (window.UI) {
                window.UI.showNotification('ID комнаты не указан', 'error');
            }
            window.location.hash = '#rooms';
            return;
        }

        // Проверка авторизации
        if (!this.auth.isAuthenticated()) {
            window.location.hash = '#home';
            this.showAuthModal(false);
            if (window.UI) {
                window.UI.showNotification('Необходима авторизация', 'error');
            }
            return;
        }

        container.innerHTML = '';
        
        // Создаем новый экземпляр CampaignGame
        this.campaignGame = new CampaignGame(this.db, this.auth);
        this.campaignGame.init(roomId);
    }

    updateUserMenu() {
        const userSection = document.querySelector('.user-section');
        const userMenu = document.getElementById('userMenu');
        const userIcon = document.getElementById('userIcon');
        const userName = document.getElementById('userName');
        const userMenuName = document.getElementById('userMenuName');
        const userMenuEmail = document.getElementById('userMenuEmail');
        const logoutBtn = document.getElementById('logoutBtn');

        if (!userMenu || !userIcon || !userSection) return;

        // Закрытие меню при клике вне его
        const closeMenuOnOutsideClick = (e) => {
            if (userMenu && userMenu.classList.contains('active')) {
                if (!userSection || !userSection.contains(e.target)) {
                    userMenu.classList.remove('active');
                    document.removeEventListener('click', closeMenuOnOutsideClick);
                }
            }
        };

        if (this.auth.isAuthenticated()) {
            const user = this.auth.currentUser;
            if (userName) userName.textContent = user.name;
            if (userMenuName) userMenuName.textContent = user.name;
            if (userMenuEmail) userMenuEmail.textContent = user.email;

            // Обработчик клика на иконку пользователя или user-section
            const toggleMenu = (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('active');
                if (userMenu.classList.contains('active')) {
                    // Добавляем обработчик закрытия при клике вне меню
                    setTimeout(() => {
                        document.addEventListener('click', closeMenuOnOutsideClick);
                    }, 10);
                } else {
                    document.removeEventListener('click', closeMenuOnOutsideClick);
                }
            };

            // Обработчик клика на user-icon
            // Используем capture phase для раннего срабатывания и предотвращения конфликтов
            if (userIcon) {
                // Привязываем обработчик с capture phase (срабатывает ПЕРВЫМ)
                userIcon.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    toggleMenu(e);
                    return false;
                }, true);
                
                // Также через onclick для максимальной надежности
                userIcon.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    toggleMenu(e);
                    return false;
                };
            }
            
            // Также обрабатываем клик на user-section (но не на иконку и не на кнопки меню)
            if (userSection) {
                userSection.addEventListener('click', (e) => {
                    // Не открываем меню если клик был на иконку (она уже обработана)
                    if (userIcon && (e.target === userIcon || userIcon.contains(e.target))) {
                        return;
                    }
                    
                    // Не открываем меню если клик был на кнопку меню или внутри меню
                    const clickedButton = e.target.closest('.user-menu__item');
                    const clickedMenu = e.target.closest('.user-menu');
                    if (clickedButton || (clickedMenu && e.target !== clickedMenu)) {
                        // Клик был на кнопке или внутри меню - не обрабатываем здесь
                        return;
                    }
                    
                    // Клик был на user-section, но не на иконку и не на меню - открываем/закрываем меню
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenu(e);
                    return false;
                }, true);
            }

            const adminPanelBtn = document.getElementById('adminPanelBtn');
            if (adminPanelBtn) {
                if (this.auth.isAdmin()) {
                    adminPanelBtn.style.display = 'block';
                    
                    // Обработчик для кнопки админ панели
                    const handleAdminClick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        window.location.hash = '#admin';
                        userMenu.classList.remove('active');
                        return false;
                    };
                    
                    adminPanelBtn.onclick = handleAdminClick;
                    adminPanelBtn.addEventListener('click', handleAdminClick, true);
                } else {
                    adminPanelBtn.style.display = 'none';
                }
            }

            if (logoutBtn) {
                // Обработчик для кнопки выхода
                const handleLogoutClick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    this.auth.logout();
                    this.updateUserMenu();
                    window.location.hash = '#home';
                    if (window.UI) {
                        window.UI.showNotification('Вы вышли из системы', 'info');
                    }
                    return false;
                };
                
                logoutBtn.onclick = handleLogoutClick;
                logoutBtn.addEventListener('click', handleLogoutClick, true);
            }
        } else {
            if (userName) userName.textContent = '';
            if (userMenuName) userMenuName.textContent = '';
            if (userMenuEmail) userMenuEmail.textContent = '';

            // Если пользователь не авторизирован, при клике на иконку предлагаем создать аккаунт
            const showRegister = (e) => {
                e.stopPropagation();
                this.showAuthModal(true); // Показываем модальное окно регистрации
            };

            if (userIcon) {
                userIcon.onclick = showRegister;
            }
            if (userSection) {
                userSection.onclick = showRegister;
            }
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});

