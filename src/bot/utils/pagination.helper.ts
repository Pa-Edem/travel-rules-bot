// src/bot/utils/pagination.helper.ts

/**
 * Утилиты для пагинации списков
 */

/**
 * Интерфейс результата пагинации
 */
export interface PaginationResult<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  startIndex: number;
  endIndex: number;
}

/**
 * Разбить массив на страницы и вернуть нужную страницу
 *
 * @param items - Полный массив элементов
 * @param page - Номер страницы (начиная с 1)
 * @param itemsPerPage - Количество элементов на странице
 * @returns Результат пагинации
 */
export function paginate<T>(
  items: T[],
  page: number = 1,
  itemsPerPage: number = 5
): PaginationResult<T> {
  // Валидация входных данных
  const validPage = Math.max(1, page);
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const currentPage = Math.min(validPage, totalPages || 1);

  // Вычисляем индексы
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, items.length);

  // Получаем элементы для текущей страницы
  const pageItems = items.slice(startIndex, endIndex);

  return {
    items: pageItems,
    currentPage,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    startIndex,
    endIndex,
  };
}

/**
 * Форматировать счетчик страниц для отображения
 *
 * @param currentPage - Текущая страница
 * @param totalPages - Всего страниц
 * @param language - Язык
 * @returns Строка типа "Страница 1/3" или "Page 1/3"
 */
export function formatPageCounter(
  currentPage: number,
  totalPages: number,
  language: 'en' | 'ru'
): string {
  const label = language === 'ru' ? 'Страница' : 'Page';
  return `${label} ${currentPage}/${totalPages}`;
}
