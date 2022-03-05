import express from 'express';
import pg from 'pg';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';

const SALT = 'Hire an assassin to kill me please';

const { Pool } = pg;

let pgConnectionConfigs;
pgConnectionConfigs = {
	user: 'gcheok',
	host: 'localhost',
	database: 'Project2',
	port: 5432,
};

const pool = new Pool(pgConnectionConfigs);

const app = express();
const PORT = 3004;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(cookieParser());

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
		`SELECT * FROM users WHERE email = '${req.body.email}'`,
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
	const allQuery = `SELECT *
		FROM workouts`;
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
	const workoutsQuery = 'SELECT * FROM workouts';
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
	const workoutsQuery = 'SELECT * FROM workouts';
	const entryQuery =
		'INSERT INTO workouts (name, date) VALUES ($1, $2) RETURNING id';

	const workoutCreationData = req.body;

	const inputData = [workoutCreationData.name, workoutCreationData.date];
	pool.query(
		entryQuery,
		inputData,
		(newWorkoutQueryError, newWorkoutQueryResult) => {
			const id = (newWorkoutQueryResult.rows[0].id);
			if (newWorkoutQueryError) {
			} else {
				res.redirect(`/workoutCreation/${id}`);
			}
		}
	);
});

//WORKOUT DATA INPUT
app.get('/workoutCreation/:id', (req, res) => {
	const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
	const unhashedCookieString = `${req.cookies.userId}-${SALT}`;
	shaObj.update(unhashedCookieString);
	const hashedCookieString = shaObj.getHash('HEX');
	const { id } = req.params;
	if (req.cookies.loggedInHash !== hashedCookieString) {
		res.status(403).send('please log in');
	} else {
		const workoutsQuery = 'SELECT * FROM exercises';
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
	const {id} = req.params
	const workoutsQuery = 'SELECT * FROM workouts';
	const entryQuery =
		'INSERT INTO sets (reps, weight) VALUES ($1, $2) RETURNING id';

	const workoutCreationData = req.body;

	const inputData = [workoutCreationData.name, workoutCreationData.date];
	pool.query(
		entryQuery,
		inputData,
		(newWorkoutQueryError, newWorkoutQueryResult) => {
			const id = (newWorkoutQueryResult.rows[0].id);
			if (newWorkoutQueryError) {
			} else {
				res.redirect(`/workoutCreation/${id}`);
			}
		}
	);
});

app.get('/exercises/all', (req, res) => {
	const getExerciseInfo = 'SELECT * FROM bodyparts';

	pool.query(getExerciseInfo, (getExercisesInfoError, getExercisesInfoResult) => {
		if (getExercisesInfoError) {
		} else {
			const bodypartsInfo = getExercisesInfoResult.rows;
			res.render('all-exercises', { bodypartsInfo });
		}
	});
});


//CREATE EXERCISE	

app.listen(PORT);
