import { kv } from '@vercel/kv';

// Начальные варианты для структуры ответа
const optionsOrder = [
  "Менее 1 часа",
  "2-3 часа",
  "3-4 часа",
  "4-6 часов",
  "Более 6 часов"
];

export default async function handler(request, response) {
  // Настройка CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Добавляем POST для сброса
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // --- Обработка GET запроса (получение результатов) ---
  if (request.method === 'GET') {
    try {
      // Получаем все поля и значения из хэша 'survey:results'
      const resultsData = await kv.hgetall('survey:results');

      // Формируем результат, гарантируя наличие всех ключей с нулями по умолчанию
      const formattedResults = {};
      let totalResponses = 0;
      optionsOrder.forEach(option => {
        const count = parseInt(resultsData?.[option] || 0, 10); // Используем 0, если ключ не найден или не число
        formattedResults[option] = count;
        totalResponses += count;
      });

      return response.status(200).json(formattedResults);

    } catch (error) {
      console.error('Ошибка GET в /api/results:', error);
      const errorMessage = error.message || 'Внутренняя ошибка сервера при чтении результатов';
      return response.status(500).json({ error: errorMessage });
    }
  }

  // --- Обработка POST запроса (сброс результатов) ---
  else if (request.method === 'POST') {
    try {
      // Проверяем, содержит ли тело запроса команду на сброс
      // Vercel парсит JSON тело автоматически
      if (request.body && request.body.action === 'reset') {

        // Удаляем старый хэш (простой способ сброса)
        await kv.del('survey:results');

        // Можно опционально сразу создать его с нулями:
        // const initialCounts = {};
        // optionsOrder.forEach(option => initialCounts[option] = 0);
        // await kv.hmset('survey:results', initialCounts);

        return response.status(200).json({ message: 'Результаты успешно сброшены' });
      } else {
        // Если POST запрос без action=reset
        return response.status(400).json({ error: 'Неверный POST запрос. Для сброса используйте {"action": "reset"} в теле.' });
      }

    } catch (error) {
      console.error('Ошибка POST в /api/results:', error);
      const errorMessage = error.message || 'Внутренняя ошибка сервера при сбросе результатов';
      return response.status(500).json({ error: errorMessage });
    }
  }

  // --- Для всех остальных методов ---
  else {
    response.setHeader('Allow', ['GET', 'POST']);
    return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
  }
}