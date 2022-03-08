INSERT INTO exercises(name) 
VALUES ('bench press'), ('pullups'), ('leg press'), ('squat'), ('deadlift'), ('shoulder press'), ('bicep curl'), ('tricep extension'), ('situp');
INSERT INTO bodyparts(name) VALUES ('chest'), ('back'), ('legs'), ('shoulders'), ('biceps'), ('triceps'), ('core');
INSERT INTO exercise_bodyparts (exercises_id, bodyparts_id) VALUES ('1', '1'), ('1', '6'), ('2', '2'), ('2', '5'), ('3', '3'), ('4','2'), ('4', '3'), ('4', '7'), ('5', '2'), ('5', '3'), ('5', '7'), ('6','4'), ('6','6'), ('7','5'), ('8','6'), ('9','7');
-- INSERT INTO workouts (name, date, user_id)