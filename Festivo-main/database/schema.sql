CREATE DATABASE IF NOT EXISTS festivo_v2;
USE festivo_v2;

CREATE TABLE user_account (
    user_id       BIGINT PRIMARY KEY AUTO_INCREMENT,
    name          VARCHAR(100) NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    phone         VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    user_type     ENUM('student','organizer','event_judge') NOT NULL DEFAULT 'student',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student (
    student_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id    BIGINT NOT NULL UNIQUE,
    roll_no    VARCHAR(30) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    year       TINYINT NOT NULL,
    CONSTRAINT fk_student_user FOREIGN KEY (user_id)
        REFERENCES user_account(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_student_year CHECK (year BETWEEN 1 AND 6)
);

CREATE TABLE fest (
    fest_id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    fest_name             VARCHAR(150) NOT NULL,
    start_date            DATE NOT NULL,
    end_date              DATE NOT NULL,
    registration_deadline DATE,
    CONSTRAINT chk_fest_dates    CHECK (end_date >= start_date),
    CONSTRAINT chk_fest_deadline CHECK (registration_deadline IS NULL
                                        OR registration_deadline <= start_date)
);

CREATE TABLE sponsor (
    sponsor_id   BIGINT PRIMARY KEY AUTO_INCREMENT,
    fest_id      BIGINT NOT NULL,
    sponsor_name VARCHAR(150) NOT NULL,
    CONSTRAINT fk_sponsor_fest FOREIGN KEY (fest_id)
        REFERENCES fest(fest_id) ON DELETE CASCADE
);

CREATE TABLE venue (
    venue_id   BIGINT PRIMARY KEY AUTO_INCREMENT,
    venue_name VARCHAR(150) NOT NULL UNIQUE,
    capacity   INT NOT NULL,
    CONSTRAINT chk_venue_capacity CHECK (capacity > 0)
);

CREATE TABLE event (
    event_id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    fest_id           BIGINT NOT NULL,
    organizer_user_id BIGINT NOT NULL,
    event_name        VARCHAR(150) NOT NULL,
    category_name     VARCHAR(100) NOT NULL,
    event_type        VARCHAR(60)  NOT NULL,
    registration_fee  DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_participants  INT NOT NULL,
    status            ENUM('open','closed','cancelled') NOT NULL DEFAULT 'open',
    description       VARCHAR(400) NOT NULL DEFAULT 'No description yet.',
    criteria          TEXT NOT NULL,
    CONSTRAINT fk_event_fest      FOREIGN KEY (fest_id) REFERENCES fest(fest_id),
    CONSTRAINT fk_event_organizer FOREIGN KEY (organizer_user_id) REFERENCES user_account(user_id),
    CONSTRAINT chk_event_type CHECK (event_type IN ('Individual', 'Team')),
    CONSTRAINT chk_event_fee      CHECK (registration_fee >= 0),
    CONSTRAINT chk_event_capacity CHECK (max_participants > 0)
);

CREATE TABLE stall (
    stall_id       BIGINT PRIMARY KEY AUTO_INCREMENT,
    fest_id        BIGINT NOT NULL,
    stall_name     VARCHAR(150) NOT NULL,
    stall_type     VARCHAR(80)  NOT NULL,
    owner_name     VARCHAR(150),
    contact_number VARCHAR(20),
    rental_fee     DECIMAL(10,2) NOT NULL DEFAULT 0,
    start_time     TIME NOT NULL,
    end_time       TIME NOT NULL,
    status         ENUM('available','booked','closed') NOT NULL DEFAULT 'available',
    CONSTRAINT fk_stall_fest  FOREIGN KEY (fest_id) REFERENCES fest(fest_id) ON DELETE CASCADE,
    CONSTRAINT chk_stall_fee  CHECK (rental_fee >= 0),
    CONSTRAINT chk_stall_time CHECK (end_time > start_time)
);

CREATE TABLE event_schedule (
    schedule_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id    BIGINT NOT NULL,
    venue_id    BIGINT NOT NULL,
    round_name  VARCHAR(100) NOT NULL,
    event_date  DATE NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    CONSTRAINT fk_schedule_event FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE,
    CONSTRAINT fk_schedule_venue FOREIGN KEY (venue_id) REFERENCES venue(venue_id),
    INDEX idx_schedule_venue_slot (venue_id, event_date, start_time),
    CONSTRAINT chk_schedule_time CHECK (end_time > start_time)
);

CREATE TABLE team (
    team_id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    team_name          VARCHAR(100) NOT NULL,
    captain_student_id BIGINT NOT NULL,
    event_id           BIGINT,
    CONSTRAINT uq_team_captain UNIQUE (captain_student_id),
    CONSTRAINT uq_team_event UNIQUE (team_id, event_id),
    CONSTRAINT fk_team_event FOREIGN KEY (event_id) REFERENCES event(event_id),
    CONSTRAINT fk_team_captain FOREIGN KEY (captain_student_id) REFERENCES student(student_id)
);

CREATE TABLE team_member (
    team_member_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    team_id        BIGINT NOT NULL,
    student_id     BIGINT NOT NULL,
    CONSTRAINT fk_member_team    FOREIGN KEY (team_id)    REFERENCES team(team_id)       ON DELETE CASCADE,
    CONSTRAINT fk_member_student FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
    CONSTRAINT uq_team_member UNIQUE (team_id, student_id)
);


CREATE TABLE registration (
    registration_id   BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id          BIGINT NOT NULL,
    student_id        BIGINT NOT NULL,
    team_id           BIGINT,
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status            ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
    CONSTRAINT fk_registration_event   FOREIGN KEY (event_id)   REFERENCES event(event_id),
    CONSTRAINT fk_registration_student FOREIGN KEY (student_id) REFERENCES student(student_id),
    CONSTRAINT fk_registration_team_event FOREIGN KEY (team_id, event_id)
        REFERENCES team(team_id, event_id),
    CONSTRAINT uq_student_event UNIQUE (student_id, event_id),
    CONSTRAINT uq_registration_event UNIQUE (registration_id, event_id),
    INDEX idx_registration_event_status (event_id, status)
);

CREATE TABLE payment (
    payment_id      BIGINT PRIMARY KEY AUTO_INCREMENT,
    registration_id BIGINT NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    payment_method  ENUM('demo','upi','card','cash','other') NOT NULL DEFAULT 'demo',
    transaction_ref VARCHAR(120) UNIQUE,
    payment_status  ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
    payment_date    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_registration FOREIGN KEY (registration_id)
        REFERENCES registration(registration_id),
    CONSTRAINT chk_payment_amount CHECK (amount >= 0)
);

CREATE TABLE event_judge (
    judge_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id  BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    CONSTRAINT fk_judge_user  FOREIGN KEY (user_id)  REFERENCES user_account(user_id),
    CONSTRAINT fk_judge_event FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE,
    CONSTRAINT uq_judge_event UNIQUE (user_id, event_id),
    CONSTRAINT uq_judge_assignment_event UNIQUE (judge_id, event_id)
);

CREATE TABLE event_feedback (
    feedback_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id        BIGINT NOT NULL,
    registration_id BIGINT NOT NULL UNIQUE,          -- one feedback per registration
    rating          TINYINT NOT NULL,
    comments        VARCHAR(1000),
    status          ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
    submitted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_event        FOREIGN KEY (event_id)        REFERENCES event(event_id)               ON DELETE CASCADE,
    CONSTRAINT fk_feedback_registration_event FOREIGN KEY (registration_id, event_id)
        REFERENCES registration(registration_id, event_id) ON DELETE CASCADE,
    CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE score (
    score_id        BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id        BIGINT NOT NULL,
    judge_id        BIGINT NOT NULL,
    registration_id BIGINT NOT NULL,
    criteria        VARCHAR(150) NOT NULL,
    score           DECIMAL(5,2) NOT NULL,
    CONSTRAINT fk_score_judge_event FOREIGN KEY (judge_id, event_id)
        REFERENCES event_judge(judge_id, event_id) ON DELETE CASCADE,
    CONSTRAINT fk_score_registration_event FOREIGN KEY (registration_id, event_id)
        REFERENCES registration(registration_id, event_id) ON DELETE CASCADE,
    CONSTRAINT chk_score_range CHECK (score BETWEEN 0 AND 100),
    CONSTRAINT uq_score UNIQUE (judge_id, registration_id, criteria)
);
