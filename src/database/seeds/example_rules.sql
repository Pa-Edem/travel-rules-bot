-- ============================================================================
-- ПРИМЕРЫ ПРАВИЛ ДЛЯ ИТАЛИИ (5 правил - по 1 на категорию)
-- ИСПРАВЛЕНО: используем правильные severity ('low', 'medium', 'high', 'critical')
-- ============================================================================

-- Удаляем старые примеры если есть
DELETE FROM rules WHERE id LIKE 'IT_%';

-- 🚗 ТРАНСПОРТ: Международное водительское удостоверение
INSERT INTO rules (
  id, country_code, category, severity, 
  fine_min, fine_max, fine_currency,
  content, sources
) VALUES (
  'IT_TRANSPORT_001',
  'IT',
  'transport',
  'critical',  -- ← САМЫЙ ВЫСОКИЙ уровень
  200, 600, 'EUR',
  '{"en": {"title": "International Driving Permit Required", "description": "Non-EU visitors must carry an IDP along with their national license when driving in Italy.", "details": "If you are visiting Italy from outside the EU/EEA, you MUST have your valid national driving license AND International Driving Permit (IDP). The IDP must be obtained BEFORE arriving in Italy. Driving without it can result in fines and vehicle impoundment. EU/EEA license holders do NOT need an IDP."}, "ru": {"title": "Требуется международное водительское удостоверение", "description": "Посетители из стран вне ЕС должны иметь МВУ вместе с национальными правами при вождении в Италии.", "details": "Если вы посещаете Италию из страны вне ЕС/ЕЭЗ, вы ДОЛЖНЫ иметь действительные национальные водительские права И международное водительское удостоверение (МВУ). МВУ необходимо получить ДО прибытия в Италию. Вождение без него может привести к штрафам и конфискации автомобиля. Обладателям прав ЕС/ЕЭЗ МВУ НЕ требуется."}}'::jsonb,
  '[{"type": "official", "url": "https://www.aci.it/", "title": "Italian Automobile Club"}]'::jsonb
);

-- 🍺 АЛКОГОЛЬ: Публичное распитие
INSERT INTO rules (
  id, country_code, category, severity,
  fine_min, fine_max, fine_currency,
  content, sources
) VALUES (
  'IT_ALCOHOL_001',
  'IT',
  'alcohol_smoking',
  'medium',  -- ← СРЕДНИЙ уровень
  150, 450, 'EUR',
  '{"en": {"title": "Public Drinking Restrictions", "description": "Drinking alcohol in public places is banned in many Italian cities after certain hours.", "details": "Many cities in Italy (Rome, Florence, Milan) have banned drinking alcohol in public spaces after specific hours (typically 8-10 PM). Bars and restaurants are allowed. Parks, streets, and squares are prohibited after certain hours. Each city sets its own rules. Violations result in fines. Always check local regulations."}, "ru": {"title": "Ограничения на публичное распитие", "description": "Употребление алкоголя в общественных местах запрещено во многих итальянских городах после определенного времени.", "details": "Многие города Италии (Рим, Флоренция, Милан) запретили употребление алкоголя в общественных местах после определенного времени (обычно 20-22 часов). Бары и рестораны разрешены. Парки, улицы, площади запрещены после определенного времени. Каждый город устанавливает свои правила. Нарушения влекут штрафы. Всегда проверяйте местные правила."}}'::jsonb,
  '[{"type": "official", "url": "https://www.comune.roma.it/", "title": "Rome Municipal Regulations"}]'::jsonb
);

-- 🚁 ДРОНЫ: Регистрация дронов
INSERT INTO rules (
  id, country_code, category, severity,
  fine_min, fine_max, fine_currency,
  content, sources
) VALUES (
  'IT_DRONE_001',
  'IT',
  'drones',
  'high',  -- ← ВЫСОКИЙ уровень
  500, 3000, 'EUR',
  '{"en": {"title": "Drone Registration Required", "description": "All drones over 250g must be registered with ENAC (Italian Civil Aviation Authority).", "details": "Before flying a drone in Italy: Drones over 250g MUST be registered with ENAC. Pilot certification required for certain categories. No-fly zones include airports, military areas, and historical sites. Maximum altitude is 120 meters. Must maintain visual line of sight. Flying unregistered drones or in restricted areas can result in heavy fines and confiscation."}, "ru": {"title": "Требуется регистрация дронов", "description": "Все дроны весом более 250г должны быть зарегистрированы в ENAC (Итальянское управление гражданской авиации).", "details": "Перед полетом дрона в Италии: дроны более 250г ДОЛЖНЫ быть зарегистрированы в ENAC. Требуется сертификация пилота для дронов определенных категорий. Запретные зоны включают аэропорты, военные объекты, исторические места. Максимальная высота 120 метров. Необходимо поддерживать визуальный контакт. Полеты незарегистрированных дронов или в запретных зонах могут привести к крупным штрафам и конфискации."}}'::jsonb,
  '[{"type": "official", "url": "https://www.enac.gov.it/", "title": "ENAC - Drone Regulations"}]'::jsonb
);

-- 💊 МЕДИКАМЕНТЫ: Рецепты на лекарства
INSERT INTO rules (
  id, country_code, category, severity,
  fine_min, fine_max, fine_currency,
  content, sources
) VALUES (
  'IT_MEDICATIONS_001',
  'IT',
  'medications',
  'high',  -- ← ВЫСОКИЙ уровень
  100, 500, 'EUR',
  '{"en": {"title": "Prescription Required for Many Medications", "description": "Many common medications require a prescription in Italy, even if available over-the-counter in your home country.", "details": "Italian pharmacies strictly regulate medications. Antibiotics ALWAYS require prescription. Strong painkillers require prescription. Sleep aids require prescription. Some allergy medications require prescription. Bring original packaging, prescription from your doctor (translated to Italian or English), and medical certificate if carrying controlled substances. Pharmacies are called Farmacia (green cross sign)."}, "ru": {"title": "Рецепт требуется для многих лекарств", "description": "Многие распространенные лекарства требуют рецепта в Италии, даже если продаются без рецепта в вашей стране.", "details": "Итальянские аптеки строго контролируют лекарства. Антибиотики ВСЕГДА требуют рецепт. Сильные обезболивающие требуют рецепт. Снотворные требуют рецепт. Некоторые лекарства от аллергии требуют рецепт. Возьмите с собой оригинальную упаковку, рецепт от врача (переведенный на итальянский или английский), медицинскую справку при провозе контролируемых веществ. Аптеки называются Farmacia (зеленый крест)."}}'::jsonb,
  '[{"type": "official", "url": "https://www.aifa.gov.it/", "title": "AIFA - Italian Medicines Agency"}]'::jsonb
);

-- 🕌 КУЛЬТУРА: Дресс-код в церквях
INSERT INTO rules (
  id, country_code, category, severity,
  content, sources
) VALUES (
  'IT_CULTURAL_001',
  'IT',
  'cultural',
  'low',  -- ← НИЗКИЙ уровень (нет штрафов)
  '{"en": {"title": "Dress Code in Churches", "description": "Modest dress is required when visiting churches and religious sites in Italy.", "details": "When entering churches and religious sites, certain clothing is not allowed: shorts (for men and women), mini skirts, sleeveless tops, low-cut tops, hats (for men). Required: covered shoulders, knees covered, respectful attire. You may be denied entry or asked to leave if not dressed appropriately. Some churches provide shawls to cover up. This applies to ALL churches, including major tourist sites like Vatican and Duomo."}, "ru": {"title": "Дресс-код в церквях", "description": "При посещении церквей и религиозных мест в Италии требуется скромная одежда.", "details": "При входе в церкви и религиозные места запрещено: шорты (для мужчин и женщин), мини-юбки, майки без рукавов, глубокие вырезы, шляпы (для мужчин). Требуется: закрытые плечи, закрытые колени, уважительная одежда. Вам могут отказать во входе, если одежда неподобающая. Некоторые церкви предоставляют платки для прикрытия. Это относится ко ВСЕМ церквям, включая главные туристические места, такие как Ватикан и Дуомо."}}'::jsonb,
  '[{"type": "official", "url": "https://www.vatican.va/", "title": "Vatican - Visitor Guidelines"}]'::jsonb
);

-- ============================================================================
-- ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================================================

SELECT '✅ Добавлено 5 правил для Италии' AS status;

SELECT 
  id,
  severity,
  content->'en'->>'title' as title_en,
  content->'ru'->>'title' as title_ru,
  CONCAT(fine_min, '-', fine_max, ' ', fine_currency) as fine
FROM rules 
WHERE id LIKE 'IT_%'
ORDER BY 
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;