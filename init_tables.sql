DROP TABLE IF EXISTS users, bodyparts, exercises, workouts, exercise_bodyparts, sets cascade;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT,
  password TEXT
);

CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  date TEXT,
  name TEXT,
  users_id INTEGER,
  CONSTRAINT fk_user
    FOREIGN KEY (users_id)
        REFERENCES users(id)
);  

CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS bodyparts (
  id SERIAL PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS sets (
  id SERIAL PRIMARY KEY,
  reps INTEGER,
  weight INTEGER,
  workouts_id INTEGER,
  exercises_id INTEGER,
  CONSTRAINT fk_workouts
    FOREIGN KEY (workouts_id)
        REFERENCES workouts(id),
  CONSTRAINT fk_exercises
    FOREIGN KEY (exercises_id)
        REFERENCES exercises(id)
);

CREATE TABLE IF NOT EXISTS exercise_bodyparts (
  id SERIAL PRIMARY KEY,
  exercises_id INTEGER,
  bodyparts_id INTEGER,
  CONSTRAINT fk_exercises
    FOREIGN KEY (exercises_id)
        REFERENCES exercises(id),
  CONSTRAINT fk_bodyparts
    FOREIGN KEY (bodyparts_id)
        REFERENCES bodyparts(id)

);