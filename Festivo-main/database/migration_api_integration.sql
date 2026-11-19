USE festivo;
ALTER TABLE event ADD COLUMN description VARCHAR(400) NOT NULL DEFAULT 'No description yet.';
ALTER TABLE event ADD COLUMN criteria TEXT NULL;
UPDATE event SET criteria = '["Creativity","Technique","Presentation"]' WHERE criteria IS NULL;
ALTER TABLE event MODIFY COLUMN criteria TEXT NOT NULL;
ALTER TABLE registration ADD COLUMN team_name VARCHAR(100) NULL;
