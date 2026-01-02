-- ============================================================================
-- Migration 003: Add track_event function
-- ============================================================================

CREATE OR REPLACE FUNCTION track_event(
  p_user_id BIGINT,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO analytics_events (user_id, event_type, event_data, created_at)
  VALUES (p_user_id, p_event_type, p_event_data, NOW());

  UPDATE users
  SET last_active = NOW()
  WHERE id = p_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Ошибка при трекинге события: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION track_event IS 'Записывает событие аналитики и обновляет last_active пользователя';