
DELIMITER //

DROP PROCEDURE IF EXISTS migrate_festivo_er_alignment//
CREATE PROCEDURE migrate_festivo_er_alignment()
BEGIN
    IF EXISTS (SELECT 1 FROM user_account GROUP BY name HAVING COUNT(*) > 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resolve duplicate user names before migration';
    END IF;

    IF EXISTS (SELECT 1 FROM user_account WHERE phone IS NOT NULL
               GROUP BY phone HAVING COUNT(*) > 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resolve duplicate user phone numbers before migration';
    END IF;

    IF EXISTS (SELECT 1 FROM team GROUP BY captain_student_id HAVING COUNT(*) > 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resolve students captaining multiple teams before migration';
    END IF;

    IF EXISTS (
        SELECT 1 FROM registration r JOIN event e ON e.event_id = r.event_id
        WHERE (e.event_type = 'Team' AND NULLIF(TRIM(r.team_name), '') IS NULL)
           OR (e.event_type = 'Individual' AND NULLIF(TRIM(r.team_name), '') IS NOT NULL)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resolve registration rows whose team names conflict with the event type';
    END IF;

    IF EXISTS (
        SELECT 1 FROM registration r JOIN event e ON e.event_id = r.event_id
        WHERE e.event_type = 'Team'
        GROUP BY r.student_id HAVING COUNT(DISTINCT r.event_id) > 1
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A legacy captain registered for multiple team events; resolve these rows before migration';
    END IF;

    IF EXISTS (
        SELECT 1 FROM registration r
        JOIN event e ON e.event_id = r.event_id
        JOIN team t ON t.captain_student_id = r.student_id
        WHERE e.event_type = 'Team' AND TRIM(t.team_name) <> TRIM(r.team_name)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resolve differences between legacy registration names and matching team rosters';
    END IF;

    IF EXISTS (
        SELECT 1 FROM score sc
        JOIN registration r ON r.registration_id = sc.registration_id
        JOIN event_judge ej ON ej.judge_id = sc.judge_id
        WHERE r.event_id <> ej.event_id
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resolve scores whose registration and judge assignment refer to different events';
    END IF;

    ALTER TABLE user_account ADD UNIQUE (name), ADD UNIQUE (phone);
    ALTER TABLE event ADD status ENUM('open','closed','cancelled') NOT NULL DEFAULT 'open';
    ALTER TABLE stall ADD owner_name VARCHAR(150);
    ALTER TABLE team
        ADD event_id BIGINT,
        ADD CONSTRAINT uq_team_captain UNIQUE (captain_student_id),
        ADD CONSTRAINT uq_team_event UNIQUE (team_id, event_id),
        ADD CONSTRAINT fk_team_event FOREIGN KEY (event_id) REFERENCES event(event_id);
    ALTER TABLE registration ADD team_id BIGINT AFTER student_id;
    ALTER TABLE score ADD event_id BIGINT AFTER score_id;

    UPDATE team t
    JOIN registration r ON r.student_id = t.captain_student_id
    JOIN event e ON e.event_id = r.event_id AND e.event_type = 'Team'
    SET t.event_id = r.event_id;

    INSERT INTO team (team_name, captain_student_id, event_id)
    SELECT TRIM(r.team_name), r.student_id, r.event_id
    FROM registration r
    JOIN event e ON e.event_id = r.event_id AND e.event_type = 'Team'
    LEFT JOIN team t ON t.captain_student_id = r.student_id
    WHERE t.team_id IS NULL;

    INSERT INTO team_member (team_id, student_id)
    SELECT t.team_id, t.captain_student_id
    FROM team t
    LEFT JOIN team_member tm ON tm.team_id = t.team_id AND tm.student_id = t.captain_student_id
    WHERE t.event_id IS NOT NULL AND tm.team_member_id IS NULL;

    UPDATE registration r
    JOIN team t ON t.captain_student_id = r.student_id AND t.event_id = r.event_id
    SET r.team_id = t.team_id;

    DROP TRIGGER IF EXISTS trg_score_eligible_entry_update;
    UPDATE score sc
    JOIN registration r ON r.registration_id = sc.registration_id
    SET sc.event_id = r.event_id;

    ALTER TABLE registration
        ADD CONSTRAINT fk_registration_team_event FOREIGN KEY (team_id, event_id)
            REFERENCES team(team_id, event_id),
        DROP COLUMN team_name;

    ALTER TABLE event_judge ADD CONSTRAINT uq_judge_assignment_event UNIQUE (judge_id, event_id);
    ALTER TABLE score
        MODIFY event_id BIGINT NOT NULL,
        DROP FOREIGN KEY fk_score_judge,
        DROP FOREIGN KEY fk_score_registration,
        ADD CONSTRAINT fk_score_judge_event FOREIGN KEY (judge_id, event_id)
            REFERENCES event_judge(judge_id, event_id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_score_registration_event FOREIGN KEY (registration_id, event_id)
            REFERENCES registration(registration_id, event_id) ON DELETE CASCADE;
END//

CALL migrate_festivo_er_alignment()//
DROP PROCEDURE IF EXISTS migrate_festivo_er_alignment//

DELIMITER ;
