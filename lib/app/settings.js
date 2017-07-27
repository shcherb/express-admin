
var slugify = require('slugify');


/**
 * Insert new tables and columns for a settings object.
 *
 * @param {Object} settings
 * @param {Object} info
 * @param {Function} callback
 * @api public
 */

exports.refresh = function (settings, info, client) {
    for (var table in info) {
        var view  = info[table].__view;
        delete info[table].__view;

        var columns = info[table],
            pk = primaryKey(columns);

        if (settings[table] === undefined) {
            settings[table] = createTable(table, pk, view);
        }

		//update tables name in "tables"
		tablesUpdate(table, view ? true: false, client);

        for (var name in columns) {
            if (exists(settings[table].columns, name)) continue;

            settings[table].columns.push(createColumn(name, columns[name]));
        }
    }
    return settings;
}

/**
 * Check for column existence.
 *
 * @param {Array} columns
 * @param {String} name
 * @api private
 */

function exists (columns, name) {
    for (var i=0; i < columns.length; i++) {
        if (columns[i].name == name) return true;
    }
    return false;
}

/**
 * Create settings object for a table.
 *
 * @param {String} name
 * @param {String} pk
 * @api private
 */

function createTable (name, pk, view) {
    return {
        slug: slugify(name),
        table: {
            name: name,
            pk: pk,
            verbose: name,
            view: view
        },
        columns: [],
        mainview: {
            show: true
        },
        listview: {
            order: {},
            page: 25
        },
        editview: {
            readonly: false
        }
    };
}

/**
 * Create a settings object for a column.
 *
 * @param {String} name
 * @param {Object} info
 * @param {Number} idx
 * @api private
 */

function createColumn (name, info) {
    return {
        name: name,
        verbose: name,
        control: {text: true},
        type: info.type,
        allowNull: info.allowNull,
        defaultValue: info.defaultValue,
        listview: {show: true},
        editview: {show: true}
    };
}

/**
 * Get the first found primary key from a given table's columns list.
 *
 * @param {Object} columns
 * @api private
 */

function primaryKey (columns) {
    var pk = [];
    for (var name in columns) {
        for (var property in columns[name]) {
            if (columns[name][property] === 'pri') {
                pk.push(name);
            }
        }
    }
    return !pk.length ? '' : (pk.length > 1 ? pk : pk[0]);
}

// update "tables" table
function tablesUpdate (table, isView, client) {
	let timestamp = new Date(Date.now()).toISOString()
	var sql = `INSERT INTO tables (name, view, "createdAt", "updatedAt")
	VALUES ('${table}', '${isView}', '${timestamp}', '${timestamp}')
	ON CONFLICT (name) DO UPDATE SET view = '${isView}', "updatedAt" = '${timestamp}';`;
	client.query(sql, function (err, rows) {
		// TODO remove rows where updatedAt less then current time
	});
}
