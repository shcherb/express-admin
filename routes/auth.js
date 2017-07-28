const bcrypt = require('bcrypt'),
      Accounts = require('../models').Accounts,
      passport = require('passport'),
	  pwd = require('pwd');


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
		        FROM tables INNER JOIN account_tables ON (tables.id = account_tables.table_id) LEFT JOIN accounts ON (account_tables.account_id = accounts.id)
                WHERE account_tables.account_id = ${userId};
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
				req.session.error = res.locals.string[err];
				res.redirect(res.locals.root+'/');
			}
		})
	} else if (req.session.user) {
		return next()
	} else {
		req.session.error = res.locals.string['access-denied'];
		res.redirect(res.locals.root+'/login');
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
	req.session.destroy(function () {
        // successfully logged out
        res.redirect(res.locals.root+'/login');
    });
}

module.exports.signup = function(req, res, next) {
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

	let newAccount = {
		username: username,
		email: email,
		salt: salt,
		password: hashedPassword
	};

	Accounts.create(newAccount)
	.then(function() {
		passport.authenticate('local')(req, res, () => {
			req.session.save((err) => {
                if (err) {
			        return next(err);
                };
		        res.redirect(res.locals.root+'/');
            })
        })
    })
    .catch(function(error) {
	    req.session.error = res.locals.string['different-username'];
	    req.session.username = req.body.username;
	    res.redirect(res.locals.root+'/signup');
    });
}
