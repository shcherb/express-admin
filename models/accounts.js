'use strict';
const bcrypt = require('bcrypt');

module.exports = function(sequelize, DataTypes) {
    const Accounts = sequelize.define('Accounts', {
        username: DataTypes.STRING,
        email: DataTypes.STRING,
        password: DataTypes.STRING,
        role_id: DataTypes.BIGINT,
        user_id: DataTypes.BIGINT,
        active: DataTypes.BOOLEAN,
        salt: DataTypes.STRING,
        admin: DataTypes.BOOLEAN
    }, {
        tableName: "accounts",
        classMethods: {
            generateHash: function(password) {
                return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
            },

            serializeUser: function(user, done) {
                done(null, {id: user.id, username: user.username})
            },

            deserializeUser: function(user, done) {
                Accounts.findOne({
                    where: {
                        'id': user.id
                    }
                }).then(function (user) {
                    if (user == null) {
                        done(new Error('Wrong user id.'))
                    }

                    done(null, user)
                })
            },

            authenticate: function(username, password, done) {
                Accounts.findOne({
                    where: {
                        'username': username
                    }
                }).then(function (user) {
                    if (user == null) {
                        return done(null, false, { message: 'Incorrect credentials.' })
                    };

                    let hashedPassword = bcrypt.hashSync(password, user.salt);

                    if (user.password === hashedPassword) {
                        return done(null, user)
                    }

                    return done(null, false, { message: 'Incorrect credentials.' })
                })
            }

        },
        instanceMethods: {
            validPassword: function(password) {
                return bcrypt.compareSync(password, this.password);
            }
        }//,
        //getterMethods: {
        //    someValue: function() {
        //        return this.someValue;
        //    }
        //},
        //setterMethods: {
        //    someValue: function(value) {
        //        this.someValue = value;
        //    }
        //}
    });
    return Accounts;
};