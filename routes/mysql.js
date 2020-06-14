var express = require('express');
var router = express.Router();
//var mysql_odbc = require('../config/db_conn')();
//var connection = mysql_odbc.init();
var mysqlDB = require('../config/db_conn')

/*
router.get('/', function(req, res, next) {
    mysqlDB.connect(function(err) {
        if (err) {
            res.render('mysql', { connect: 'Fail',err:err });
            console.error(err);
            throw err;
        }else{
            res.render('mysql', { connect: 'Success',err:'No' });
        }
    });
    mysqlDB.end();
});

module.exports = router;*/