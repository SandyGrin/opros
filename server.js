const express = require('express');
const fs = require('fs').promises; // Используем промисы для асинхронной работы
const path = require('path');

const app = express();
const PORT = 3000; // Порт, на котором будет работать сервер
const DATA_FILE = path.join(__dirname, 'results.json'); // Путь к файлу данных
const PUBLIC_DIR = path.join(__dirname, 'public'); // Путь к папке с HTML

// --- Начальные данные опроса ---
const initialData = {
    "Менее 1 часа": 0,
    "2-3 часа": 0,
    "3-4 часа": 0,
    "4-6 часов": 0,
    "Более 6 часов": 0
};

// --- Функция для чтения данных из файла ---
async function readData() {
    try {
        await fs.access(DATA_FILE); // Проверяем, существует ли файл
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Если файл не найден или ошибка чтения/парсинга, возвращаем начальные данные
        console.warn(`Файл ${DATA_FILE} не найден или поврежден. Используются начальные данные.`);
        return { ...initialData }; // Возвращаем копию!
    }
}

// --- Функция для записи данных в файл ---
async function writeData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8'); // null, 2 для красивого форматирования
    } catch (error) {
        console.error('Ошибка записи в файл:', error);
        throw new Error('Не удалось сохранить данные'); // Пробрасываем ошибку дальше
    }
}

// --- Мидлвэр для обработки JSON-запросов ---
app.use(express.json());

// --- Мидлвэр для раздачи статических файлов (HTML, CSS, JS из папки public) ---
app.use(express.static(PUBLIC_DIR));

// --- Маршрут для отправки ответа ---
app.post('/submit', async (req, res) => {
    const { answer } = req.body;

    if (!answer || typeof initialData[answer] === 'undefined') {
        return res.status(400).json({ message: 'Неверный вариант ответа' });
    }

    try {
        const currentData = await readData();
        currentData[answer]++; // Увеличиваем счетчик
        await writeData(currentData);
        res.status(200).json({ message: 'Ответ успешно сохранен' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при сохранении ответа' });
    }
});

// --- Маршрут для получения данных результатов ---
app.get('/results-data', async (req, res) => {
    try {
        const data = await readData();
        res.status(200).json(data);
    } catch (error) {
        // Ошибка чтения уже обработана в readData, но на всякий случай
        res.status(500).json({ message: 'Ошибка сервера при чтении результатов' });
    }
});

// --- Маршрут для сброса результатов ---
app.post('/reset', async (req, res) => {
    try {
        await writeData({ ...initialData }); // Записываем начальные данные (копию)
        res.status(200).json({ message: 'Результаты успешно сброшены' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при сбросе результатов' });
    }
});

// --- Обработка корневого маршрута - отдать index.html ---
// Это необязательно, если express.static('/') работает корректно, но для ясности
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});


// --- Запуск сервера ---
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    // Проверка/создание файла при запуске
    readData().then(data => {
        if (Object.keys(data).length !== Object.keys(initialData).length) {
             console.log(`Файл ${DATA_FILE} инициализирован.`);
             writeData({...initialData });
        } else {
             console.log(`Файл ${DATA_FILE} найден.`);
        }
    }).catch(err => console.error("Ошибка при инициализации файла данных:", err));
});