
SELECT event_id, event_name, max_participants, registered_count, seats_remaining
FROM v_event_registration_summary
ORDER BY registered_count DESC, event_id;

SELECT event_id, event_name, category_name, fest_name
FROM v_event_registration_summary
WHERE CONCAT_WS(' ', event_name, category_name, fest_name) LIKE '%music%'
ORDER BY event_name;

SELECT e.event_id, e.event_name, COUNT(*) AS active_registrations
FROM registration AS r
JOIN event AS e ON e.event_id = r.event_id
WHERE r.status <> 'cancelled'
GROUP BY e.event_id, e.event_name
HAVING COUNT(*) >= 1
ORDER BY active_registrations DESC, e.event_id;

SELECT organizer_user_id, collected, pending, transaction_count
FROM v_organizer_payment_summary
ORDER BY organizer_user_id;

SELECT r.event_id, r.registration_id, SUM(s.score) AS total_score,
       RANK() OVER (PARTITION BY r.event_id ORDER BY SUM(s.score) DESC) AS event_rank
FROM score AS s
JOIN registration AS r ON r.registration_id = s.registration_id
GROUP BY r.event_id, r.registration_id
ORDER BY r.event_id, event_rank, r.registration_id;

SELECT r.student_id, 'Registration' AS activity, r.registration_date AS activity_date
FROM registration AS r
UNION ALL
SELECT r.student_id, 'Payment', p.payment_date
FROM payment AS p JOIN registration AS r ON r.registration_id = p.registration_id
UNION ALL
SELECT r.student_id, 'Feedback', f.submitted_at
FROM event_feedback AS f JOIN registration AS r ON r.registration_id = f.registration_id
ORDER BY student_id, activity_date DESC;

SELECT e.event_id, e.event_name
FROM event AS e
WHERE NOT EXISTS (
    SELECT 1 FROM registration AS r
    WHERE r.event_id = e.event_id AND r.status <> 'cancelled'
);
