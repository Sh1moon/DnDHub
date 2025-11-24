class FriendsManager {
    constructor(database, auth) {
        this.db = database;
        this.auth = auth;
    }

    init() {
        this.renderFriendsList();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('friendSearchInput');
        const searchBtn = document.getElementById('friendSearchBtn');
        const friendsList = document.getElementById('friendsList');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchUsers());
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchUsers();
                }
            });
        }

        // Делегирование событий для кнопок добавления/удаления друзей
        if (friendsList) {
            friendsList.addEventListener('click', (e) => {
                if (e.target.classList.contains('add-friend-btn')) {
                    const userId = parseInt(e.target.dataset.userId);
                    this.addFriend(userId);
                } else if (e.target.classList.contains('remove-friend-btn')) {
                    const userId = parseInt(e.target.dataset.userId);
                    this.removeFriend(userId);
                }
            });
        }
    }

    renderFriendsList() {
        const container = document.getElementById('friendsList');
        if (!container) return;

        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        const friends = this.db.getFriends(currentUser.id);
        const friendsList = document.getElementById('friendsList');
        
        if (friendsList) {
            friendsList.innerHTML = `
                ${friends.length === 0 ? `
                    <div class="empty-state">
                        <p>У вас пока нет друзей</p>
                        <p>Используйте поиск, чтобы найти других игроков</p>
                    </div>
                ` : `
                    <div class="friends-grid">
                        ${friends.map(friend => `
                            <div class="friend-card" data-friend-id="${friend.id}">
                                <div class="friend-avatar">
                                    <img src="./src/img/user.svg" alt="${friend.name}">
                                </div>
                                <div class="friend-info">
                                    <h4>${friend.name || 'Без имени'}</h4>
                                    <p>${friend.email}</p>
                                </div>
                                <button class="btn btn-danger btn-small remove-friend-btn" data-user-id="${friend.id}">
                                    Удалить
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `}
            `;
        }
    }

    searchUsers() {
        const searchInput = document.getElementById('friendSearchInput');
        const resultsContainer = document.getElementById('friendSearchResults');
        
        if (!searchInput || !resultsContainer) return;

        const query = searchInput.value.trim();
        if (!query) {
            resultsContainer.innerHTML = '<p class="empty-state">Введите имя или email для поиска</p>';
            return;
        }

        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        const users = this.db.searchUsers(query, currentUser.id);
        const friends = this.db.getFriends(currentUser.id);
        const friendIds = friends.map(f => f.id);

        if (users.length === 0) {
            resultsContainer.innerHTML = '<p class="empty-state">Пользователи не найдены</p>';
            return;
        }

        resultsContainer.innerHTML = `
            <div class="search-results-list">
                ${users.map(user => {
                    const isFriend = friendIds.includes(user.id);
                    return `
                        <div class="search-result-item">
                            <div class="result-avatar">
                                <img src="./src/img/user.svg" alt="${user.name}">
                            </div>
                            <div class="result-info">
                                <h4>${user.name || 'Без имени'}</h4>
                                <p>${user.email}</p>
                            </div>
                            ${isFriend ? `
                                <button class="btn btn-secondary btn-small" disabled>Уже в друзьях</button>
                            ` : `
                                <button class="btn btn-primary btn-small add-friend-btn" data-user-id="${user.id}">
                                    Добавить
                                </button>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Добавляем обработчики для кнопок добавления
        resultsContainer.querySelectorAll('.add-friend-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = parseInt(e.target.dataset.userId);
                this.addFriend(userId);
            });
        });
    }

    addFriend(friendId) {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        const success = this.db.addFriend(currentUser.id, friendId);
        if (success) {
            if (window.UI) {
                window.UI.showNotification('Друг добавлен', 'success');
            }
            this.renderFriendsList();
            this.searchUsers(); // Обновляем результаты поиска
        } else {
            if (window.UI) {
                window.UI.showNotification('Не удалось добавить друга', 'error');
            }
        }
    }

    removeFriend(friendId) {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        const success = this.db.removeFriend(currentUser.id, friendId);
        if (success) {
            if (window.UI) {
                window.UI.showNotification('Друг удален', 'success');
            }
            this.renderFriendsList();
        } else {
            if (window.UI) {
                window.UI.showNotification('Не удалось удалить друга', 'error');
            }
        }
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.FriendsManager = FriendsManager;
}

