const bcrypt = require('bcryptjs'),
      passport = require('passport'),
	  pwd = require('pwd'),
      render = require('./render');
;


exports.status = function (req, res, next) {
    res.locals.show = {
        error: req.session.error,
        success: req.session.success
    };
    res.locals.username = req.session.username;
    delete req.session.error;
    delete req.session.success;
    delete req.session.username;
    next();
}

exports.restrict = function (req, res, next) {
	if (res.locals._admin.debug) return next();

	if (req.isAuthenticated()) {
		let name = res.locals._admin.slugs[req.params[0]];
		if (!req.params[0] || !name) return next()
		let dbClient = res.locals._admin.db.client,
			userId = req.session.passport.user.id,
			sql = `
                SELECT tables.name, tables.view, accounts.admin
		        FROM tables INNER JOIN account_tables ON (tables.id = account_tables.table_id) RIGHT JOIN accounts ON (account_tables.account_id = accounts.id)
                WHERE accounts.id = ${userId};
	        `;
		dbClient.query(sql, function (err, rows) {
			try {
				if (rows[0].admin || rows.some(function (el) {return el.name == name}) || res.locals._admin.custom[name]) {
					return next();
				} else {
					throw 'access-denied';
				}
			}
			catch (err) {
				res.locals.show.error = 'access-denied';
				res.locals.partials = { content: 'login' };
				render.admin(req, res);
				// req.session.error = res.locals.string[err];
				// res.redirect(res.locals.root+'/');
			}
		})
	} else if (req.session.user) {
		return next()
	} else {
		res.locals.show.error = 'access-denied';
		res.locals.partials = { content: 'login' };
		render.admin(req, res);
		// req.session.error = res.locals.string['access-denied'];
		// res.redirect(res.locals.root+'/login');
	}
}

exports.login = function (req, res) {
    // query the db for the given username
    var user = res.locals._admin.users[req.body.username];
    if (!user) {
        req.session.error = res.locals.string['find-user'];
        req.session.username = req.body.username;
        res.redirect(res.locals.root+'/login');
        return;
    }

    // apply the same algorithm to the POSTed password, applying
    // the hash against the pass / salt, if there is a match we
    // found the user
    pwd.hash(req.body.password, user.salt, function (err, hash) {
        if (hash !== user.hash) {
            req.session.error = res.locals.string['invalid-password'];
            req.session.username = req.body.username;
            res.redirect(res.locals.root+'/login');
            return;
        }

        // Regenerate session when signing in
        // to prevent fixation
        req.session.regenerate(function (err) {
            // Store the user's primary key
            // in the session store to be retrieved,
            // or in this case the entire user object
            req.session.user = user;
            res.redirect(res.locals.root+'/');
        });
    });
}

exports.logout = function (req, res) {
    // destroy the user's session to log them out
    // will be re-created next request
	req.logout();
	res.redirect(res.locals.root+'/login');
	// req.session.destroy(function () {
   //      // successfully logged out
   //      res.redirect(res.locals.root+'/login');
   //  });
}

exports.signup = function(req, res, next) {
	let username = req.body.username,
	    email = req.body.email,
	    password = req.body.password,
	    password2 = req.body.password2;

	if (!username || !password || !password2) {
		req.session.error = res.locals.string['all-fields'];
		req.session.username = req.body.username;
		res.redirect(res.locals.root+'/signup');
		return;
	}

	if (password !== password2) {
		req.session.error = res.locals.string['same-password'];
		req.session.username = req.body.username;
		res.redirect(res.locals.root+'/signup');
		return;
	}

	let salt = bcrypt.genSaltSync(10);
	let hashedPassword = bcrypt.hashSync(password, salt);

	const values = [
		username,
		email,
		hashedPassword,
		salt,
		new Date(Date.now()).toISOString(),
		new Date(Date.now()).toISOString()
	];

	const dbClient = res.locals._admin.db.client,
		  sql = {
			  text: "INSERT INTO accounts (username, email, password, salt, \"createdAt\", \"updatedAt\")\
                             VALUES ($1, $2, $3, $4, $5, $6);",
			  values: values
		  };

	dbClient.query(sql, function (err, rows) {
		if (err){
			req.session.error = res.locals.string['different-username'];
			req.session.username = req.body.username;
			res.redirect(res.locals.root+'/signup');
		}
		passport.authenticate('local')(req, res, () => {
			req.session.save((err) => {
			    if (err) {
		            return next(err);
		        };
		        res.redirect(res.locals.root+'/');
	        })
        })
    })
}

//exports.serializeUser = function(user, done) {
//	done(null, {id: user.id, username: user.username})
//}
//
//exports.deserializeUser = function(user, done) {
//	const dbClient = res.locals._admin.db.client,
//		sql = {
//			text: "SELECT * FROM accounts WHERE id = $1",
//			values: [user.id]
//		}
//
//	dbClient.query(sql, function (err, rows) {
//		if (rows == null) {
//			done(new Error('Wrong user id.'))
//		};
//		done(null, rows[0]);
//	})
//}
//
//exports.authenticate = function(username, password, done) {
//	const ///dbClient = res.locals._admin.db.client,
//		sql = "SELECT * FROM accounts WHERE username = $1",
//		values = [username];
//
//	dbClient.query(sql, values, function (err, user) {
//		if (user == null) {
//			return done(null, false, { message: 'Incorrect credentials.' })
//		};
//
//		const hashedPassword = bcrypt.hashSync(password, user.salt);
//
//		if (user.password === hashedPassword) {
//			return done(null, user)
//		};
//
//		return done(null, false, { message: 'Incorrect credentials.' });
//	})
//}
//
