'use strict';

const fs        = require('fs');
const path      = require('path');
const Sequelize = require('sequelize');
const basename  = path.basename(module.filename);
//const config    = require(__dirname + '/../config/config.json')['pg'];
const db        = {};
const config = require('../app').client.config;

const sequelize = new Sequelize(
    `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`
    );

Object.assign(sequelize.options, { logging: true });  // if 'logging' is true SQL query will shown

fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(function(file) {
    const model = sequelize['import'](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(function(modelName) {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
