// Импортируем клиент Vercel KV
import { kv } from '@vercel/kv';

// Начальные варианты (чтобы проверять корректность ответа)
const validOptions = [
  "Менее 1 часа",
  "2-3 часа",
  "3-4 часа",
  "4-6 часов",
  "Более 6 часов"
];

// Экспортируем функцию-обработчик
export default async function handler(request, response) {
  // Разрешаем запросы с любых источников (или укажите ваш домен Vercel)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработка preflight запроса для CORS
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Ожидаем только POST запросы
  if (request.method !== 'POST') {
    response.setHeader('Allow', ['POST']);
    return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
  }

  try {
    // Получаем ответ из тела запроса (Vercel автоматически парсит JSON, если Content-Type правильный)
    const { answer } = request.body;

    // Валидация ответа
    if (!answer || !validOptions.includes(answer)) {
      return response.status(400).json({ error: 'Неверный или отсутствующий вариант ответа' });
    }

    // Атомарно увеличиваем счетчик для этого ответа в KV хранилище
    // Используем хэш 'survey:results' и поле с именем варианта ответа
    const newCount = await kv.hincrby('survey:results', answer, 1);

    // Отправляем успешный ответ
    return response.status(200).json({ message: 'Ответ успешно сохранен', answer: answer, count: newCount });

  } catch (error) {
    console.error('Ошибка в /api/submit:', error);
    // Пытаемся извлечь сообщение из ошибки KV, если оно есть
    const errorMessage = error.message || 'Внутренняя ошибка сервера при сохранении ответа';
    // Отправляем ошибку клиенту
    return response.status(500).json({ error: errorMessage });
  }
}