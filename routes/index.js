const express = require('express');
const router = express.Router();
const deps = require('../deps');

/* GET home page. */
router.get('/', (req, res, next) => {
  deps.check((result) => {
    res.render('index', { deps: result });
  });
});

module.exports = router;
