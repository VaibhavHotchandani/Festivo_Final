USE festivo_v2;

SET @demo_today = CURRENT_DATE();

INSERT INTO user_account (user_id, name, email, phone, password_hash, user_type) VALUES
 (1, 'Riya Sharma',     'student@festivo.test',   '9876543210', '$2b$10$qytxiltn111k06Pl8iAiAesj7feioPDHqnlO8.PCHvLwIdtxWlVKe', 'student'),
 (2, 'Arjun Mehta',     'organizer@festivo.test', '9811122233', '$2b$10$qytxiltn111k06Pl8iAiAesj7feioPDHqnlO8.PCHvLwIdtxWlVKe', 'organizer'),
 (3, 'Dr. Kavita Rao',  'judge@festivo.test',     '9822233344', '$2b$10$qytxiltn111k06Pl8iAiAesj7feioPDHqnlO8.PCHvLwIdtxWlVKe', 'event_judge'),
 (4, 'Neel Kapoor',     'student2@festivo.test',  '9833344455', '$2b$10$qytxiltn111k06Pl8iAiAesj7feioPDHqnlO8.PCHvLwIdtxWlVKe', 'student'),
 (5, 'Prof. Sameer Jain','judge2@festivo.test',   '9844455566', '$2b$10$qytxiltn111k06Pl8iAiAesj7feioPDHqnlO8.PCHvLwIdtxWlVKe', 'event_judge'),
 (6, 'Meera Iyer',      'organizer2@festivo.test','9855566677', '$2b$10$qytxiltn111k06Pl8iAiAesj7feioPDHqnlO8.PCHvLwIdtxWlVKe', 'organizer');

INSERT INTO student (student_id, user_id, roll_no, department, year) VALUES
 (1, 1, '21CS101', 'CSE', 3),
 (2, 4, '21EC045', 'ECE', 2);

INSERT INTO fest (fest_id, fest_name, start_date, end_date, registration_deadline) VALUES
 (1, 'Festivo 2026',       DATE_ADD(@demo_today, INTERVAL 7 DAY), DATE_ADD(@demo_today, INTERVAL 9 DAY), DATE_ADD(@demo_today, INTERVAL 2 DAY)),
 (2, 'Techno Sprint 2026', DATE_ADD(@demo_today, INTERVAL 22 DAY), DATE_ADD(@demo_today, INTERVAL 23 DAY), DATE_ADD(@demo_today, INTERVAL 18 DAY));

INSERT INTO sponsor (fest_id, sponsor_name) VALUES
 (1, 'Nimbus Telecom'), (1, 'GreenLeaf Foods'), (2, 'ByteForge Labs');

INSERT INTO venue (venue_id, venue_name, capacity) VALUES
 (1, 'Main Auditorium', 800), (2, 'Seminar Hall A', 150), (3, 'Open Air Theatre', 1200), (4, 'Computer Lab 2', 60);

INSERT INTO event (event_id, fest_id, organizer_user_id, event_name, category_name, event_type, registration_fee, max_participants, description, criteria) VALUES
 (1, 1, 2, 'Battle of Bands',       'Music',     'Team',       500, 40, 'A live band competition.', '["Creativity","Technique","Stage presence"]'),
 (2, 1, 2, 'Solo Singing',          'Music',     'Individual', 100, 60, 'Showcase your vocal talent.', '["Pitch","Rhythm","Expression"]'),
 (3, 1, 2, 'Street Dance Showdown', 'Dance',     'Team',       400, 30, 'A street dance team battle.', '["Choreography","Technique","Energy"]'),
 (4, 1, 2, 'Photography Walk',      'Arts',      'Individual',   0, 50, 'Capture campus life through photography.', '["Composition","Creativity","Story"]'),
 (5, 2, 6, 'Hackathon 24',          'Technical', 'Team',       300, 80, 'Build a project in 24 hours.', '["Innovation","Implementation","Presentation"]'),
 (6, 2, 6, 'Code Debugging Sprint', 'Technical', 'Individual',  50, 60, 'Find and fix bugs under time pressure.', '["Accuracy","Speed","Code quality"]'),
 (7, 2, 6, 'Robo Race',             'Technical', 'Team',       600, 24, 'A robot racing challenge.', '["Speed","Control","Design"]'),
 (8, 1, 2, 'Stand-up Open Mic',     'Literary',  'Individual',   0, 25, 'A campus comedy open mic.', '["Originality","Delivery","Audience response"]');

INSERT INTO event_schedule (event_id, venue_id, round_name, event_date, start_time, end_time) VALUES
 (1, 3, 'Prelims',           DATE_ADD(@demo_today, INTERVAL 7 DAY), '16:00', '19:00'),
 (1, 1, 'Finals',            DATE_ADD(@demo_today, INTERVAL 9 DAY), '18:00', '21:00'),
 (2, 2, 'Auditions',         DATE_ADD(@demo_today, INTERVAL 8 DAY), '10:00', '13:00'),
 (3, 3, 'Finals',            DATE_ADD(@demo_today, INTERVAL 8 DAY), '17:00', '19:30'),
 (4, 3, 'Walk + Submission', DATE_ADD(@demo_today, INTERVAL 9 DAY), '07:00', '10:00'),
 (5, 4, 'Hacking Round',     DATE_ADD(@demo_today, INTERVAL 22 DAY), '09:00', '21:00'),
 (6, 4, 'Round 1',           DATE_ADD(@demo_today, INTERVAL 23 DAY), '10:00', '12:00'),
 (8, 2, 'Open Mic',          DATE_ADD(@demo_today, INTERVAL 8 DAY), '19:00', '21:00');

INSERT INTO stall (fest_id, stall_name, stall_type, contact_number, rental_fee, start_time, end_time, status) VALUES
 (1, 'Chai & Chill', 'Food & Beverage', '98765 43210', 3000, '09:00', '21:00', 'booked'),
 (1, 'Pixel Prints', 'Merchandise',     '98123 45670', 2000, '10:00', '20:00', 'available'),
 (1, 'Henna Corner', 'Arts & Crafts',   '99887 76655', 1200, '11:00', '19:00', 'available'),
 (1, 'Gaming Zone',  'Games',           '90000 11122', 4500, '10:00', '22:00', 'booked'),
 (2, 'Gadget Bazaar','Merchandise',     '97000 22211', 2500, '09:00', '18:00', 'available'),
 (2, 'Dosa Junction','Food & Beverage', '96000 33344', 3200, '09:00', '20:00', 'closed');

INSERT INTO event_judge (user_id, event_id) VALUES (3, 2), (3, 4), (5, 1);

