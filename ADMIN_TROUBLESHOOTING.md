# Решение проблем с входом в админ-аккаунт

## Возможные причины, почему не получается войти в админ-аккаунт:

### 1. **База данных не была инициализирована**
Если вы только что установили приложение, база данных может еще не быть создана.

**Решение:**
- Откройте консоль браузера (F12)
- Выполните: `localStorage.clear()` и перезагрузите страницу
- Админ-аккаунт будет создан автоматически при первой загрузке

### 2. **Неправильный email или пароль**
Убедитесь, что вы используете правильные данные:
- **Email:** `admin@dndhub.com`
- **Пароль:** `admin123`

**Важно:** Email чувствителен к регистру! Используйте именно `admin@dndhub.com` (все строчные буквы).

### 3. **Пароль был изменен или захеширован неправильно**
Если админ-аккаунт был создан ранее, но пароль не работает:

**Решение:**
1. Откройте консоль браузера (F12)
2. Выполните следующий код:

```javascript
// Получаем базу данных
const db = JSON.parse(localStorage.getItem('dnd_database'));
if (!db) {
    console.log('База данных не найдена. Перезагрузите страницу.');
} else {
    // Находим админа
    const admin = db.users.find(u => u.email === 'admin@dndhub.com');
    if (admin) {
        console.log('Админ найден:', admin);
        // Хешируем пароль заново
        const hashPassword = (password) => {
            let hash = 0;
            for (let i = 0; i < password.length; i++) {
                const char = password.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString();
        };
        admin.password = hashPassword('admin123');
        db.users = db.users.map(u => u.id === admin.id ? admin : u);
        localStorage.setItem('dnd_database', JSON.stringify(db));
        console.log('Пароль сброшен. Новый хеш:', admin.password);
        console.log('Перезагрузите страницу и попробуйте войти снова.');
    } else {
        console.log('Админ не найден. Создаем нового...');
        const hashPassword = (password) => {
            let hash = 0;
            for (let i = 0; i < password.length; i++) {
                const char = password.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString();
        };
        const newAdmin = {
            id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
            email: 'admin@dndhub.com',
            password: hashPassword('admin123'),
            name: 'Администратор',
            role: 'admin',
            createdAt: new Date().toISOString()
        };
        if (!db.users) db.users = [];
        db.users.push(newAdmin);
        localStorage.setItem('dnd_database', JSON.stringify(db));
        console.log('Админ создан. Перезагрузите страницу.');
    }
}
```

### 4. **Проблема с хешированием пароля**
Если вы пытаетесь войти, но получаете ошибку "Неверный email или пароль", возможно проблема в хешировании.

**Проверка:**
1. Откройте консоль браузера (F12)
2. Выполните:

```javascript
const db = JSON.parse(localStorage.getItem('dnd_database'));
const admin = db.users.find(u => u.email === 'admin@dndhub.com');
if (admin) {
    console.log('Текущий хеш пароля админа:', admin.password);
    
    // Хешируем пароль для проверки
    const hashPassword = (password) => {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    };
    
    const correctHash = hashPassword('admin123');
    console.log('Правильный хеш для "admin123":', correctHash);
    console.log('Хеши совпадают?', admin.password === correctHash);
}
```

### 5. **База данных повреждена**
Если ничего не помогает, попробуйте полностью очистить и пересоздать базу данных:

**Решение:**
1. Откройте консоль браузера (F12)
2. Выполните: `localStorage.removeItem('dnd_database')`
3. Перезагрузите страницу
4. Админ-аккаунт будет создан автоматически

### 6. **Проблема с авторизацией по имени**
Если вы пытаетесь войти используя имя "Администратор" вместо email:

**Важно:** Админ-аккаунт можно найти только по email `admin@dndhub.com`, а не по имени!

### 7. **Проверка существования админа**
Чтобы проверить, существует ли админ-аккаунт:

```javascript
const db = JSON.parse(localStorage.getItem('dnd_database') || '{}');
const users = db.users || [];
const admin = users.find(u => u.email === 'admin@dndhub.com');
if (admin) {
    console.log('Админ найден:', {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        hasPassword: !!admin.password
    });
} else {
    console.log('Админ не найден. Всего пользователей:', users.length);
    console.log('Пользователи:', users);
}
```

## Рекомендации

1. **Всегда используйте email для входа:** `admin@dndhub.com`
2. **Пароль чувствителен к регистру:** `admin123` (все строчные)
3. **Если ничего не помогает:** Очистите localStorage и перезагрузите страницу
4. **Проверяйте консоль браузера:** Там могут быть ошибки, которые помогут диагностировать проблему

## Альтернативный способ создания админа

Если стандартный способ не работает, создайте админа вручную:

```javascript
const db = JSON.parse(localStorage.getItem('dnd_database') || '{}');
if (!db.users) db.users = [];

const hashPassword = (password) => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
};

const adminExists = db.users.some(u => u.email === 'admin@dndhub.com');
if (!adminExists) {
    const newAdmin = {
        id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
        email: 'admin@dndhub.com',
        password: hashPassword('admin123'),
        name: 'Администратор',
        role: 'admin',
        createdAt: new Date().toISOString()
    };
    db.users.push(newAdmin);
    localStorage.setItem('dnd_database', JSON.stringify(db));
    console.log('Админ создан успешно!');
} else {
    console.log('Админ уже существует.');
}
```

После выполнения этого кода перезагрузите страницу и попробуйте войти снова.

