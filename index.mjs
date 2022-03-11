import express from 'express';
import pg from 'pg';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';

const SALT = 'Hire an assassin to kill me please';

const { Pool } = pg;

// ...

let pgConnectionConfigs;

// test to see if the env var is set. Then we know we are in Heroku
if (process.env.DATABASE_URL) {
  // pg will take in the entire value and use it to connect
  pgConnectionConfigs = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  // this is the same value as before
  pgConnectionConfigs = {
    user: 'gcheok',
    host: 'localhost',
    database: 'Project2',
    port: 5432,
  };
}
const pool = new Pool(pgConnectionConfigs);

// ...
const app = express();
const PORT = process.env.PORT || 3004;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(cookieParser());

// HASHING

//ROUTES
//SIGN UP ROUTES
app.get('/signup', (req, res) => {
	const { loggedIn } = req.cookies;
	res.render('sign-up', { loggedIn });
});

app.post('/signup', (req, res) => {
	const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });

	shaObj.update(req.body.password);

	const hashedPassword = shaObj.getHash('HEX');

	const newUserQuery = 'INSERT INTO users (email, password) VALUES ($1, $2)';
	const inputData = [req.body.email, hashedPassword];

	pool.query(
		newUserQuery,
		inputData,
		(newUserQueryError, newUserQueryResult) => {
			if (newUserQueryError) {
			} else {
				res.redirect('/login');
			}
		}
	);
});

//LOGIN ROUTES
app.get('/login', (req, res) => {
	const { loggedIn } = req.cookies;
	res.render('login', { loggedIn });
});

app.post('/login', (req, res) => {
	pool.query(
		`SELECT * FROM users WHERE ema	il = '${req.body.email}'`,
		(emailQueryError, emailQueryResult) => {
			if (emailQueryError) {
				res.status(503).send('request not successful');
				return;
			}

			if (emailQueryResult.rows.length === 0) {
				res.status(403).send('not successful');
				return;
			}

			const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
			shaObj.update(req.body.password);
			const hashedPassword = shaObj.getHash('HEX');
			if (emailQueryResult.rows[0].password === hashedPassword) {
				res.cookie('loggedIn', true);

				const shaObj1 = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
				const unhashedCookieString = `${emailQueryResult.rows[0].id}-${SALT}`;
				shaObj1.update(unhashedCookieString);
				const hashedCookieString = shaObj1.getHash('HEX');
				res.cookie('loggedInHash', hashedCookieString);
				res.cookie('userId', emailQueryResult.rows[0].id);
				res.redirect('/');
			} else {
				res.status(403).send('not successful');
			}
		}
	);
});

//LANDING PAGE ROUTES
app.get('/', (req, res) => {
	const userId = req.cookies.userId;
	const allQuery = `SELECT * FROM workouts WHERE users_id = ${userId}`;
	pool.query(allQuery, (allQueryError, allQueryResult) => {
		if (allQueryError) {
		} else {
			const allNotes = allQueryResult.rows;
			const { loggedIn } = req.cookies;
			res.render('landing-page', { allNotes, loggedIn });
		}
	});
});

//CREATE WORKOUT
app.get('/workoutCreation', (req, res) => {
	const userId = req.cookies.userId;
	// console.log(req.cookies.userId);
	const workoutsQuery = `SELECT * FROM workouts WHERE users_id = ${userId}`;
	pool.query(workoutsQuery, (workoutsQueryError, workoutsQueryResult) => {
		if (workoutsQueryError) {
		} else {
			const data = {
				workouts: workoutsQueryResult.rows,
			};
			res.render('workoutCreation', data);
		}
	});
});

app.post('/workoutCreation', (req, res) => {
	const entryQuery =
		'INSERT INTO workouts (name, date, users_id) VALUES ($1, $2, $3) RETURNING id';

	const workoutCreationData = req.body;
	const userId = req.cookies.userId;

	const inputData = [
		workoutCreationData.name,
		workoutCreationData.date,
		userId,
	];
	pool.query(
		entryQuery,
		inputData,
		(newWorkoutQueryError, newWorkoutQueryResult) => {
			const id = newWorkoutQueryResult.rows[0].id;
			if (newWorkoutQueryError) {
			} else {
				res.redirect(`/workoutCreation/${id}`);
			}
		}
	);
});

//WORKOUT DATA INPUT

app.get('/sets/:id', (req, res) => {
	const id = req.params.id;
	console.log(id);
	const allQuery = `SELECT exercises.name, sets.reps, sets.weight, sets.workouts_id
		FROM sets
		INNER JOIN exercises
		ON sets.exercises_id = exercises.id
		WHERE workouts_id = ${id};`;
	pool.query(allQuery, (allQueryError, allQueryResult) => {
		if (allQueryError) {
		} else {
			const allNotes = allQueryResult.rows;
			const { loggedIn } = req.cookies;
			res.render('sets', { allNotes, loggedIn });
		}
	});
});

app.get('/workoutCreation/:id', (req, res) => {
	const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
	const unhashedCookieString = `${req.cookies.userId}-${SALT}`;
	shaObj.update(unhashedCookieString);
	const hashedCookieString = shaObj.getHash('HEX');
	const { id } = req.params;
	if (req.cookies.loggedInHash !== hashedCookieString) {
		res.status(403).send('please log in');
	} else {
		const workoutsQuery = `SELECT * 
        FROM exercises`;
		pool.query(workoutsQuery, (workoutsQueryError, workoutsQueryResult) => {
			if (workoutsQueryError) {
			} else {
				const data = {
					id: req.params.id,
					workouts: workoutsQueryResult.rows,
				};
				res.render('workoutDataInput', data);
			}
		});
	}
});

app.post('/workoutCreation/:id', (req, res) => {
	const id = req.params.id;
	const entryQuery =
		'INSERT INTO sets (reps, weight, exercises_id, workouts_id) VALUES ($1, $2, $3 ,$4) RETURNING id';

	const workoutCreationData = req.body;
	// console.log(workoutCreationData)

	const inputData = [
		workoutCreationData.reps,
		workoutCreationData.weight,
		workoutCreationData.exercises_id,
		id,
	];
	pool.query(
		entryQuery,
		inputData,
		(newWorkoutQueryError, newWorkoutQueryResult) => {
			// console.log(JSON.stringify(newWorkoutQueryResult.rows[0].id))
			// const id = newWorkoutQueryResult.rows[0].id;
			if (newWorkoutQueryError) {
			} else {
				res.redirect(`/workoutCreation/${id}`);
			}
		}
	);
});

app.get('/exercises/all', (req, res) => {
	const getExerciseInfo = 'SELECT * FROM bodyparts';

	pool.query(
		getExerciseInfo,
		(getExercisesInfoError, getExercisesInfoResult) => {
			if (getExercisesInfoError) {
			} else {
				const bodypartsInfo = getExercisesInfoResult.rows;
				res.render('all-exercises', { bodypartsInfo });
			}
		}
	);
});

//CREATE EXERCISE
app.get('/exerciseCreation', (req, res) => {
	const exerciseQuery = 'SELECT * FROM exercises';
	pool.query(exerciseQuery, (exerciseQueryError, exerciseQueryResult) => {
		if (exerciseQueryError) {
		} else {
			const data = {
				exercises: exerciseQueryResult.rows,
			};
			res.render('exerciseCreation', data);
		}
	});
});

app.post('/exerciseCreation', (req, res) => {
	const entryQuery = 'INSERT INTO exercises (name) VALUES ($1) RETURNING id';

	const exerciseCreationData = req.body;

	const inputData = [exerciseCreationData.name];

	pool.query(
		entryQuery,
		inputData,
		(newexerciseQueryError, newexerciseQueryResult) => {
			if (newexerciseQueryError) {
			} else {
				const exerciseId = newexerciseQueryResult.rows[0].id;
				console.log(exerciseId);
				exerciseCreationData.bodyparts.forEach((bodyparts) => {
					console.log(exerciseCreationData);
					const bodypartsIdQuery = `SELECT id FROM bodyparts WHERE name = '${bodyparts}'`;
					console.log(bodypartsIdQuery);
					pool.query(
						bodypartsIdQuery,
						(bodypartsIdQueryError, bodypartsIdQueryResult) => {
							if (bodypartsIdQueryError) {
							} else {
								// console.log(bodypartsIdQueryResult)
								const bodypartsId = bodypartsIdQueryResult.rows[0].id;
								const bodypartsData = [exerciseId, bodypartsId];

								const notesbodypartsEntry =
									'INSERT INTO exercise_bodyparts (exercises_id, bodyparts_id) VALUES ($1, $2)';

								pool.query(
									notesbodypartsEntry,
									bodypartsData,
									(notesbodypartsEntryError, notesbodypartsEntryResult) => {
										if (notesbodypartsEntryError) {
										} else {
										}
									}
								);
							}
						}
					);
				});
				res.redirect(`/exercises/all`);
			}
		}
	);
});

// deletes a single note
app.delete('/workoutCreation/:id/delete', (req, res) => {
	const workoutId = Number(req.params.id);
	const getNoteInfoQuery = `SELECT * FROM workouts WHERE id = ${workoutId}`;
	pool.query(
		getNoteInfoQuery,
		(getNoteInfoQueryError, getNoteInfoQueryResult) => {
			if (getNoteInfoQueryError) {
				console.log('error', getNoteInfoQueryError);
			} else {
				console.log(getNoteInfoQueryResult.rows);
				const noteInfo = getNoteInfoQueryResult.rows[0];
				console.log('user_id', noteInfo.users_id);
				console.log('userId from cookies', req.cookies.userId);
				console.log('note id:', noteInfo.id);
				console.log('date', noteInfo.date);
				if (noteInfo.users_id === Number(req.cookies.userId)) {
					const deleteNoteQuery = `DELETE FROM workouts WHERE id = ${workoutId}`;
					pool.query(deleteNoteQuery, (deleteNoteError, deleteNoteResult) => {
						if (deleteNoteError) {
							console.log('error', deleteNoteError);
						} else {
							res.redirect('/');
						}
					});
				} else {
					res.send('You are not authorised to delete this post. ');
				}
			}
		}
	);
});

app.get('/exercises/chest', (req, res) => {
	const chestQuery = `SELECT exercises.id, exercises.name, bodyparts.name AS bodyparts
	FROM exercises
	INNER JOIN exercise_bodyparts
	ON exercises.id = exercise_bodyparts.exercises_id
	INNER JOIN bodyparts
	ON exercise_bodyparts.bodyparts_id = bodyparts.id
	WHERE bodyparts.id = 1 
	`;

	pool.query(chestQuery, (chestQueryError, chestQueryResult) => {
		if (chestQueryError) {
		} else {
			const data = chestQueryResult.rows;
			res.render('bodypart_exercises', { data });
		}
	});
});

app.get('/exercises/back', (req, res) => {
	const backQuery = `SELECT exercises.id, exercises.name, bodyparts.name AS bodyparts
	FROM exercises
	INNER JOIN exercise_bodyparts
	ON exercises.id = exercise_bodyparts.exercises_id
	INNER JOIN bodyparts
	ON exercise_bodyparts.bodyparts_id = bodyparts.id
	WHERE bodyparts.id = 2 
	`;
	pool.query(backQuery, (backQueryError, backQueryResult) => {
		if (backQueryError) {
		} else {
			const data = backQueryResult.rows;
			console.log(data[0].bodyparts);
			res.render('bodypart_exercises', { data });
		}
	});
});

app.get('/exercises/legs', (req, res) => {
	const legsQuery = `SELECT exercises.id, exercises.name, bodyparts.name AS bodyparts
	FROM exercises
	INNER JOIN exercise_bodyparts
	ON exercises.id = exercise_bodyparts.exercises_id
	INNER JOIN bodyparts
	ON exercise_bodyparts.bodyparts_id = bodyparts.id
	WHERE bodyparts.id = 3 
	`;
	pool.query(legsQuery, (legsQueryError, legsQueryResult) => {
		if (legsQueryError) {
		} else {
			const data = legsQueryResult.rows;
			res.render('bodypart_exercises', { data });
		}
	});
});

app.get('/exercises/shoulders', (req, res) => {
	const shouldersQuery = `SELECT exercises.id, exercises.name, bodyparts.name AS bodyparts
	FROM exercises
	INNER JOIN exercise_bodyparts
	ON exercises.id = exercise_bodyparts.exercises_id
	INNER JOIN bodyparts
	ON exercise_bodyparts.bodyparts_id = bodyparts.id
	WHERE bodyparts.id = 4 
	`;

	pool.query(shouldersQuery, (shouldersQueryError, shouldersQueryResult) => {
		if (shouldersQueryError) {
		} else {
			const data = shouldersQueryResult.rows;
			res.render('bodypart_exercises', { data });
		}
	});
});

app.get('/exercises/biceps', (req, res) => {
	const bicepsQuery = `SELECT exercises.id, exercises.name, bodyparts.name AS bodyparts
	FROM exercises
	INNER JOIN exercise_bodyparts
	ON exercises.id = exercise_bodyparts.exercises_id
	INNER JOIN bodyparts
	ON exercise_bodyparts.bodyparts_id = bodyparts.id
	WHERE bodyparts.id = 5 
	`;
	pool.query(bicepsQuery, (bicepsQueryError, bicepsQueryResult) => {
		if (bicepsQueryError) {
		} else {
			const data = bicepsQueryResult.rows;
			res.render('bodypart_exercises', { data });
		}
	});
});

app.get('/exercises/triceps', (req, res) => {
	const tricepsQuery = `SELECT exercises.id, exercises.name, bodyparts.name AS bodyparts
	FROM exercises
	INNER JOIN exercise_bodyparts
	ON exercises.id = exercise_bodyparts.exercises_id
	INNER JOIN bodyparts
	ON exercise_bodyparts.bodyparts_id = bodyparts.id
	WHERE bodyparts.id = 6 
	`;

	pool.query(tricepsQuery, (tricepsQueryError, tricepsQueryResult) => {
		if (tricepsQueryError) {
		} else {
			const data = tricepsQueryResult.rows;
			res.render('bodypart_exercises', { data });
		}
	});
});

app.get('/exercises/core', (req, res) => {
	const coreQuery = `SELECT exercises.id, exercises.name, bodyparts.name AS bodyparts
	FROM exercises
	INNER JOIN exercise_bodyparts
	ON exercises.id = exercise_bodyparts.exercises_id
	INNER JOIN bodyparts
	ON exercise_bodyparts.bodyparts_id = bodyparts.id
	WHERE bodyparts.id = 7 
	`;

	pool.query(coreQuery, (coreQueryError, coreQueryResult) => {
		if (coreQueryError) {
		} else {
			const data = coreQueryResult.rows;
			res.render('bodypart_exercises', { data });
		}
	});
});

//LOGOUT
app.delete('/logout', (req, res) => {
	res.clearCookie('loggedIn');
	res.clearCookie('userId');
	res.clearCookie('loggedInHash');
	res.redirect('/login');
});

app.listen(PORT);
