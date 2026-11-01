const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'orders.json');

// --- ВАШИ ДАННЫЕ ---
const TG_TOKEN = '9112693380:AAEM8vGulrr3yvAPFQ_EluyCjZYay4Tho4Q';
const TG_CHAT_ID = '1432838249';

app.use(express.json());
app.use(express.static(__dirname)); // Раздает ваш index.html и папку images

// Чтение базы заказов
function getOrders() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '[]');
}

// Сохранение базы заказов
function saveOrders(orders) {
    fs.writeFileSync(DB_FILE, JSON.stringify(orders, null, 2));
}

// 1. Клиент отправляет заказ
app.post('/api/orders', async (req, res) => {
    const orders = getOrders();
    const newOrder = req.body;
    newOrder.id = 'LG-' + Date.now().toString(36).toUpperCase();
    newOrder.status = 'new';
    newOrder.createdAt = new Date().toISOString();
    
    orders.unshift(newOrder);
    saveOrders(orders);

    // --- ОТПРАВКА В ТЕЛЕГРАМ С СЕРВЕРА ---
    // Убрали Адрес, оставили Имя и Телефон
    const text = `🛒 <b>НОВЫЙ ЗАКАЗ!</b>\n\n<b>Номер:</b> ${newOrder.id}\n<b>Логин на сайте:</b> ${newOrder.clientLogin || 'Не указано'}\n\n<b>Данные клиента:</b>\n👤 Имя: ${newOrder.clientName || 'Не указано'}\n📞 Телефон: ${newOrder.clientPhone || 'Не указано'}\n\n<b>Сумма:</b> ${newOrder.total} BYN\n\n<b>Товары:</b>\n${newOrder.items.map(i => `- ${i.title} (${i.price} BYN)`).join('\n')}`;
    
    try {
        await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            chat_id: TG_CHAT_ID,
            text: text,
            parse_mode: 'HTML'
        });
        console.log('✅ Уведомление в Telegram отправлено!');
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:');
        if (error.response) console.error(error.response.data);
        else console.error(error.message);
    }

    res.json(newOrder);
});

// 2. Мастер запрашивает все заказы
app.get('/api/orders', (req, res) => {
    res.json(getOrders());
});

// 3. Мастер меняет статус заказа
app.put('/api/orders/:id', (req, res) => {
    const orders = getOrders();
    const index = orders.findIndex(o => o.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Не найден' });
    
    orders[index].status = req.body.status;
    orders[index].updatedAt = new Date().toISOString();
    saveOrders(orders);
    res.json(orders[index]);
});

// Запуск
app.listen(PORT, () => {
    console.log('====================================');
    console.log('СЕРВЕР ЗАПУЩЕН!');
    console.log('Открывайте сайт по ссылке: http://localhost:3000');
    console.log('====================================');
});