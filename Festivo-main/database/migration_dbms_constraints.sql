SELECT score_id, score FROM score WHERE score NOT BETWEEN 0 AND 100;
SELECT event_id, event_type FROM event WHERE event_type NOT IN ('Individual', 'Team');
SELECT ef.feedback_id, ef.event_id, r.event_id AS registration_event_id
FROM event_feedback AS ef
JOIN registration AS r ON r.registration_id = ef.registration_id
WHERE ef.event_id <> r.event_id;

ALTER TABLE score
    DROP CHECK chk_score_nonnegative,
    ADD CONSTRAINT chk_score_range CHECK (score BETWEEN 0 AND 100);

ALTER TABLE event
    ADD CONSTRAINT chk_event_type CHECK (event_type IN ('Individual', 'Team'));

ALTER TABLE event_schedule
    ADD INDEX idx_schedule_venue_slot (venue_id, event_date, start_time);

ALTER TABLE registration
    ADD UNIQUE KEY uq_registration_event (registration_id, event_id),
    ADD INDEX idx_registration_event_status (event_id, status);

ALTER TABLE event_feedback
    ADD CONSTRAINT fk_feedback_registration_event FOREIGN KEY (registration_id, event_id)
        REFERENCES registration (registration_id, event_id) ON DELETE CASCADE;

ALTER TABLE event_feedback
    DROP FOREIGN KEY fk_feedback_registration;
