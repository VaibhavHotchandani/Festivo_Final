
DELIMITER //

DROP TRIGGER IF EXISTS trg_schedule_no_overlap_insert//
CREATE TRIGGER trg_schedule_no_overlap_insert
BEFORE INSERT ON event_schedule
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1
        FROM event_schedule AS es
        WHERE NEW.end_time > NEW.start_time
          AND es.venue_id = NEW.venue_id
          AND es.event_date = NEW.event_date
          AND es.start_time < NEW.end_time
          AND es.end_time > NEW.start_time
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Venue is already booked for that time';
    END IF;
END//

DROP TRIGGER IF EXISTS trg_schedule_no_overlap_update//
CREATE TRIGGER trg_schedule_no_overlap_update
BEFORE UPDATE ON event_schedule
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1
        FROM event_schedule AS es
        WHERE NEW.end_time > NEW.start_time
          AND es.venue_id = NEW.venue_id
          AND es.event_date = NEW.event_date
          AND es.start_time < NEW.end_time
          AND es.end_time > NEW.start_time
          AND es.schedule_id <> OLD.schedule_id
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Venue is already booked for that time';
    END IF;
END//

DROP TRIGGER IF EXISTS trg_judge_account_role_insert//
CREATE TRIGGER trg_judge_account_role_insert
BEFORE INSERT ON event_judge
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_account
        WHERE user_id = NEW.user_id AND user_type = 'event_judge'
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only judge accounts can be assigned';
    END IF;
END//

DROP TRIGGER IF EXISTS trg_judge_account_role_update//
CREATE TRIGGER trg_judge_account_role_update
BEFORE UPDATE ON event_judge
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_account
        WHERE user_id = NEW.user_id AND user_type = 'event_judge'
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only judge accounts can be assigned';
    END IF;
END//

DROP TRIGGER IF EXISTS trg_score_eligible_entry_insert//
CREATE TRIGGER trg_score_eligible_entry_insert
BEFORE INSERT ON score
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM event_judge AS ej
        JOIN registration AS r ON r.event_id = ej.event_id
        WHERE ej.judge_id = NEW.judge_id
          AND r.registration_id = NEW.registration_id
          AND r.status = 'confirmed'
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Score requires a confirmed registration in the assigned event';
    END IF;
END//

DROP TRIGGER IF EXISTS trg_score_eligible_entry_update//
CREATE TRIGGER trg_score_eligible_entry_update
BEFORE UPDATE ON score
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM event_judge AS ej
        JOIN registration AS r ON r.event_id = ej.event_id
        WHERE ej.judge_id = NEW.judge_id
          AND r.registration_id = NEW.registration_id
          AND r.status = 'confirmed'
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Score requires a confirmed registration in the assigned event';
    END IF;
END//

DELIMITER ;
