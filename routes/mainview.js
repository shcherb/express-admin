
exports.get = function (req, res, next) {
	let settings = res.locals._admin.settings,
		custom = res.locals._admin.custom,
		dbClient = res.locals._admin.db.client,
		userId = req.session.passport.user,
		isAdmin = false;

	// check user access to table or view
	let	sql = `
            SELECT tables.name, tables.view, accounts.admin
	FROM tables INNER JOIN account_tables ON (tables.id = account_tables.table_id) LEFT JOIN accounts ON (account_tables.account_id = accounts.id)
	WHERE account_tables.account_id = ${userId};
	    `;
	dbClient.query(sql, function (err, rows) {
		if (rows.length > 0) isAdmin = rows[0].admin;
		var tables = [];
		for (var key in settings) {
			var item = settings[key];
			if (!item.mainview.show || !item.table.pk || item.table.view) continue;
			if (rows.some(function(el){return el.name == item.table.name && !el.view}) || isAdmin) {
				tables.push({slug: item.slug, name: item.table.verbose});
			}
		}

		var views = [];
		for (var key in settings) {
			var item = settings[key];
			if (!item.mainview.show || !item.table.view) continue;
			if (rows.some(function(el){return el.name == item.table.name && el.view}) || isAdmin) {
				views.push({slug: item.slug, name: item.table.verbose});
			}
		}

		var customs = [];
		for (var key in custom) {
			var item = custom[key].app;
			if (!item || !item.mainview || !item.mainview.show) continue;
			customs.push({slug: item.slug, name: item.verbose});
		}

		res.locals.tables = !tables.length ? null : {items: tables};
		res.locals.views = !views.length ? null : {items: views};
		res.locals.custom = !customs.length ? null : {items: customs};

		res.locals.partials = {
			content: 'mainview'
		};

		next();
	});
}