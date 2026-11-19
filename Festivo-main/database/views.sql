CREATE OR REPLACE VIEW v_event_registration_summary AS
SELECT e.*, f.fest_name, f.registration_deadline,
       COALESCE(rc.registered_count, 0) AS registered_count,
       GREATEST(e.max_participants - COALESCE(rc.registered_count, 0), 0) AS seats_remaining
FROM event AS e
JOIN fest AS f ON f.fest_id = e.fest_id
LEFT JOIN (
    SELECT event_id, COUNT(*) AS registered_count
    FROM registration
    WHERE status <> 'cancelled'
    GROUP BY event_id
) AS rc ON rc.event_id = e.event_id;

CREATE OR REPLACE VIEW v_organizer_payment_summary AS
SELECT e.organizer_user_id,
       SUM(CASE WHEN p.payment_status = 'success' THEN p.amount ELSE 0 END) AS collected,
       SUM(CASE WHEN p.payment_status = 'pending' THEN p.amount ELSE 0 END) AS pending,
       COUNT(p.payment_id) AS transaction_count
FROM event AS e
LEFT JOIN registration AS r ON r.event_id = e.event_id
LEFT JOIN payment AS p ON p.registration_id = r.registration_id
GROUP BY e.organizer_user_id;
