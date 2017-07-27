
exports.admin = function (req, res) {

    res.locals.partials.header = 'header';
    res.locals.partials.breadcrumbs = 'breadcrumbs';
    res.locals.partials.theme = 'js/theme';
    res.locals.partials.layout = 'js/layout';

	try {user = req.session.passport.user}
	catch (err) {user = undefined};

    res.render('base', {

        user: user,
        csrf: req.csrfToken(),

        url: {
            home: '/'
        }
    });
}
