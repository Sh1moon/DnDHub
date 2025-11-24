class Database {
    constructor() {
        this.initDatabase();
        this.setupStorageListener();
    }

    initDatabase() {
        const db = localStorage.getItem('dnd_database');
        if (!db) {
            // Загружаем данные из DB.json
            fetch('./src/data/DB.json')
                .then(response => response.json())
                .then(data => {
                    // Добавляем пустые массивы для пользователей и комнат если их нет
                    if (!data.users) data.users = [];
                    if (!data.characters) data.characters = [];
                    if (!data.rooms) data.rooms = [];
                    
                    // Создаем админ-аккаунт если его нет
                    const adminExists = data.users.some(u => u.email === 'admin@dndhub.com');
                    if (!adminExists) {
                        // Простое хеширование пароля (в продакшене использовать bcrypt)
                        const hashPassword = (password) => {
                            let hash = 0;
                            for (let i = 0; i < password.length; i++) {
                                const char = password.charCodeAt(i);
                                hash = ((hash << 5) - hash) + char;
                                hash = hash & hash;
                            }
                            return hash.toString();
                        };
                        
                        const adminUser = {
                            id: 1,
                            email: 'admin@dndhub.com',
                            password: hashPassword('admin123'),
                            name: 'Администратор',
                            role: 'admin',
                            createdAt: new Date().toISOString()
                        };
                        data.users.push(adminUser);
                    }
                    
                    localStorage.setItem('dnd_database', JSON.stringify(data));
                    // Вызываем событие обновления для перезагрузки данных
                    window.dispatchEvent(new CustomEvent('databaseUpdated'));
                })
                .catch(error => {
                    console.error('Ошибка загрузки DB.json:', error);
                    // Создаем базовую структуру
                    const hashPassword = (password) => {
                        let hash = 0;
                        for (let i = 0; i < password.length; i++) {
                            const char = password.charCodeAt(i);
                            hash = ((hash << 5) - hash) + char;
                            hash = hash & hash;
                        }
                        return hash.toString();
                    };
                    
                    const defaultData = {
                        users: [{
                            id: 1,
                            email: 'admin@dndhub.com',
                            password: hashPassword('admin123'),
                            name: 'Администратор',
                            role: 'admin',
                            createdAt: new Date().toISOString()
                        }],
                        characters: [],
                        rooms: [],
                        расы: [],
                        черты_рас: [],
                        классы: [],
                        заклинания: [],
                        классы_заклинаний: [],
                        монстры: [],
                        способности_монстров: [],
                        предметы: [],
                        умения_классов: [],
                        ячейки_заклинаний: []
                    };
                    localStorage.setItem('dnd_database', JSON.stringify(defaultData));
                });
        } else {
            // Проверяем наличие админ-аккаунта в существующей БД
            const data = JSON.parse(db);
            if (!data.users) data.users = [];
            const adminExists = data.users.some(u => u.email === 'admin@dndhub.com');
            if (!adminExists) {
                const hashPassword = (password) => {
                    let hash = 0;
                    for (let i = 0; i < password.length; i++) {
                        const char = password.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash;
                    }
                    return hash.toString();
                };
                
                const adminUser = {
                    id: data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1,
                    email: 'admin@dndhub.com',
                    password: hashPassword('admin123'),
                    name: 'Администратор',
                    role: 'admin',
                    createdAt: new Date().toISOString()
                };
                data.users.push(adminUser);
                localStorage.setItem('dnd_database', JSON.stringify(data));
            }
        }
    }

    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'dnd_database') {
                // Синхронизация между вкладками
                window.dispatchEvent(new CustomEvent('databaseUpdated'));
            }
        });
    }

    getData(key = null) {
        const db = JSON.parse(localStorage.getItem('dnd_database') || '{}');
        return key ? db[key] : db;
    }

    updateData(key, data) {
        const db = this.getData();
        db[key] = data;
        localStorage.setItem('dnd_database', JSON.stringify(db));
        window.dispatchEvent(new CustomEvent('databaseUpdated'));
    }

    // CRUD для пользователей
    createUser(userData) {
        const users = this.getData('users') || [];
        const newUser = {
            id: Date.now(),
            ...userData,
            createdAt: new Date().toISOString(),
            role: userData.role || 'user'
        };
        users.push(newUser);
        this.updateData('users', users);
        return newUser;
    }

    getUserByEmail(email) {
        const users = this.getData('users') || [];
        return users.find(u => u.email === email);
    }

    getUserById(id) {
        const users = this.getData('users') || [];
        return users.find(u => u.id === id);
    }

    updateUser(id, updates) {
        const users = this.getData('users') || [];
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            this.updateData('users', users);
            return users[index];
        }
        return null;
    }

    // CRUD для персонажей
    createCharacter(characterData) {
        const characters = this.getData('characters') || [];
        const newCharacter = {
            id: Date.now(),
            ...characterData,
            createdAt: new Date().toISOString()
        };
        characters.push(newCharacter);
        this.updateData('characters', characters);
        return newCharacter;
    }

    getCharacters(userId = null) {
        const characters = this.getData('characters') || [];
        return userId ? characters.filter(c => c.userId === userId) : characters;
    }

    getCharacterById(id) {
        const characters = this.getData('characters') || [];
        return characters.find(c => c.id === id);
    }

    updateCharacter(id, updates) {
        const characters = this.getData('characters') || [];
        const index = characters.findIndex(c => c.id === id);
        if (index !== -1) {
            characters[index] = { ...characters[index], ...updates };
            this.updateData('characters', characters);
            return characters[index];
        }
        return null;
    }

    deleteCharacter(id) {
        const characters = this.getData('characters') || [];
        const filtered = characters.filter(c => c.id !== id);
        this.updateData('characters', filtered);
        return true;
    }

    // CRUD для комнат
    createRoom(roomData) {
        const rooms = this.getData('rooms') || [];
        const newRoom = {
            id: Date.now(),
            code: this.generateRoomCode(),
            ...roomData,
            participants: [],
            messages: [],
            createdAt: new Date().toISOString()
        };
        rooms.push(newRoom);
        this.updateData('rooms', rooms);
        return newRoom;
    }

    generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    getRooms(userId = null) {
        const rooms = this.getData('rooms') || [];
        if (userId) {
            return rooms.filter(r => 
                r.ownerId === userId || 
                r.participants.some(p => p.userId === userId)
            );
        }
        return rooms;
    }

    getRoomById(id) {
        const rooms = this.getData('rooms') || [];
        return rooms.find(r => r.id === id);
    }

    getRoomByCode(code) {
        const rooms = this.getData('rooms') || [];
        return rooms.find(r => r.code === code);
    }

    updateRoom(id, updates) {
        const rooms = this.getData('rooms') || [];
        const index = rooms.findIndex(r => r.id === id);
        if (index !== -1) {
            rooms[index] = { ...rooms[index], ...updates };
            this.updateData('rooms', rooms);
            return rooms[index];
        }
        return null;
    }

    deleteRoom(id) {
        const rooms = this.getData('rooms') || [];
        const filtered = rooms.filter(r => r.id !== id);
        this.updateData('rooms', filtered);
        return true;
    }

    // Получение данных справочников
    getRaces() {
        return this.getData('расы') || [];
    }

    getRaceById(id) {
        const races = this.getRaces();
        return races.find(r => r.id === id);
    }

    getClasses() {
        return this.getData('классы') || [];
    }

    getClassById(id) {
        const classes = this.getClasses();
        return classes.find(c => c.id === id);
    }

    getSpells() {
        return this.getData('заклинания') || [];
    }

    getSpellsByClass(classId) {
        const spells = this.getSpells();
        const classSpells = this.getData('классы_заклинаний') || [];
        const spellIds = classSpells
            .filter(cs => cs.класс_id === classId)
            .map(cs => cs.заклинание_id);
        return spells.filter(s => spellIds.includes(s.id));
    }

    getMonsters() {
        return this.getData('монстры') || [];
    }

    getItems() {
        return this.getData('предметы') || [];
    }

    getClassFeatures(classId) {
        const features = this.getData('умения_классов') || [];
        return features.filter(f => f.класс_id === classId);
    }

    getRaceTraits(raceId) {
        const traits = this.getData('черты_рас') || [];
        return traits.filter(t => t.раса_id === raceId);
    }

    // Обновление базы данных из DB.json
    async updateFromDBJson() {
        try {
            const response = await fetch('./src/data/DB.json');
            if (!response.ok) {
                throw new Error('Не удалось загрузить DB.json');
            }
            const data = await response.json();
            
            // Сохраняем текущих пользователей, персонажей и комнаты
            const currentDb = this.getData();
            const preservedData = {
                users: currentDb.users || [],
                characters: currentDb.characters || [],
                rooms: currentDb.rooms || []
            };
            
            // Объединяем данные: сохраняем пользователей, персонажей и комнаты, обновляем остальное
            const updatedData = {
                ...data,
                users: preservedData.users,
                characters: preservedData.characters,
                rooms: preservedData.rooms
            };
            
            // Убеждаемся, что админ-аккаунт существует
            const adminExists = updatedData.users.some(u => u.email === 'admin@dndhub.com');
            if (!adminExists) {
                const hashPassword = (password) => {
                    let hash = 0;
                    for (let i = 0; i < password.length; i++) {
                        const char = password.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash;
                    }
                    return hash.toString();
                };
                
                const adminUser = {
                    id: updatedData.users.length > 0 ? Math.max(...updatedData.users.map(u => u.id)) + 1 : 1,
                    email: 'admin@dndhub.com',
                    password: hashPassword('admin123'),
                    name: 'Администратор',
                    role: 'admin',
                    createdAt: new Date().toISOString()
                };
                updatedData.users.push(adminUser);
            }
            
            // Сохраняем обновленные данные
            localStorage.setItem('dnd_database', JSON.stringify(updatedData));
            
            // Вызываем событие обновления
            window.dispatchEvent(new CustomEvent('databaseUpdated'));
            
            return true;
        } catch (error) {
            console.error('Ошибка обновления базы данных:', error);
            return false;
        }
    }
}

    // Управление друзьями
    getFriends(userId) {
        const users = this.getData('users') || [];
        const user = users.find(u => u.id === userId);
        if (!user) return [];
        return (user.friends || []).map(friendId => users.find(u => u.id === friendId)).filter(Boolean);
    }

    addFriend(userId, friendId) {
        const users = this.getData('users') || [];
        const user = users.find(u => u.id === userId);
        if (!user) return false;
        
        if (!user.friends) user.friends = [];
        if (!user.friends.includes(friendId)) {
            user.friends.push(friendId);
            this.updateData('users', users);
            return true;
        }
        return false;
    }

    removeFriend(userId, friendId) {
        const users = this.getData('users') || [];
        const user = users.find(u => u.id === userId);
        if (!user || !user.friends) return false;
        
        user.friends = user.friends.filter(id => id !== friendId);
        this.updateData('users', users);
        return true;
    }

    searchUsers(query, excludeUserId = null) {
        const users = this.getData('users') || [];
        const lowerQuery = query.toLowerCase().trim();
        
        return users
            .filter(u => {
                if (excludeUserId && u.id === excludeUserId) return false;
                if (!lowerQuery) return true;
                return (u.name && u.name.toLowerCase().includes(lowerQuery)) ||
                       (u.email && u.email.toLowerCase().includes(lowerQuery));
            })
            .slice(0, 20); // Ограничиваем результаты
    }

    // Поиск публичных комнат
    getPublicRooms(excludeUserId = null) {
        const rooms = this.getData('rooms') || [];
        return rooms.filter(r => {
            if (!r.isPublic) return false;
            if (excludeUserId && r.ownerId === excludeUserId) return false;
            if (r.participants && r.participants.some(p => p.userId === excludeUserId)) return false;
            return true;
        });
    }

    searchPublicRooms(query, excludeUserId = null) {
        const rooms = this.getPublicRooms(excludeUserId);
        if (!query) return rooms;
        
        const lowerQuery = query.toLowerCase().trim();
        return rooms.filter(r => {
            return (r.name && r.name.toLowerCase().includes(lowerQuery)) ||
                   (r.description && r.description.toLowerCase().includes(lowerQuery));
        });
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.Database = Database;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Database;
}

