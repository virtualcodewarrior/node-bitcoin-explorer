
/**
 * Module dependencies.
 */

var express = require('express');
var winston = require('winston');
var Step = require('step');
var bitcoin = require('bitcoin-p2p');
var RpcClient = require('jsonrpc2').Client;
var bigint = global.bigint = bitcoin.bigint;

global.Util = require('./util');
var fs = require('fs');

var init = require('bitcoin-p2p/daemon/init');
var config = init.getConfig();

var app = module.exports = express.createServer();

var rpcClient = new RpcClient(config.jsonrpc.port, config.jsonrpc.host,
                              config.jsonrpc.username, config.jsonrpc.password);

var rpc = rpcClient.connectSocket();

rpc.on('connect', function () {
  var moduleSrc = fs.readFileSync(__dirname + '/query.js', 'utf8');
  rpc.call('definerpcmodule', ['explorer', moduleSrc], function (err) {
    if (err) {
      console.error('Error registering query module: '+err.toString());
    }
  });
});

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Params

app.param('blockHash', function (req, res, next, hash){
  hash = Util.decodeHex(hash).reverse();
  var hash64 = hash.toString('base64');
  rpc.call('explorer.blockquery', [hash64], function (err, data) {
    if (err) return next(err);

    req.block = data;

    next();
  });
});

app.param('txHash', function (req, res, next, hash){
  hash = Util.decodeHex(hash).reverse();
  var hash64 = hash.toString('base64');
  rpc.call('explorer.txquery', [hash64], function (err, tx) {
    if (err) return next(err);

    req.tx = tx;

    // TODO: Show side chain blocks containing this tx
    next();
  });
});

app.param('addrBase58', function (req, res, next, addr){
  var pubKeyHash = Util.addressToPubKeyHash(addr);
  req.pubKeyHash = pubKeyHash;
  var pubKeyHash64 = pubKeyHash.toString('base64');

  rpc.call('explorer.addrquery', [pubKeyHash64], function (err, addr) {
    if (err) return next(err);

    req.addr = addr;

    next();
  });
});

// Routes

app.get('/', function(req, res, next){
  rpc.call('explorer.indexquery', [10], function (err, result) {
    if (err) {
      next(err);
      return;
    }
    result.title = 'Home - Bitcoin Explorer';
    res.render('index', result);
  });
});

app.get('/block/:blockHash', function (req, res) {
  res.render('block', {
    title: 'Block '+req.block.block.height+' - Bitcoin Explorer',
    block: req.block.block,
    txs: req.block.txs,
    nextBlock: req.block.nextBlock,
    totalAmount: req.block.totalAmount,
    totalFee: req.block.totalFee,
    totalOut: req.block.totalOut,
    blockValue: req.block.blockValue,
    hexDifficulty: bigint(req.block.block.bits).toString(16)
  });
});

app.get('/tx/:txHash', function (req, res) {
  res.render('transaction', {
    title: req.tx.tx ?
      ('Tx '+req.tx.tx.hash.substr(0, 10)+'... - Bitcoin Explorer') :
      'Unknown tx',
    tx: req.tx.tx,
    block: req.tx.block,
    totalOut: req.tx.totalOut
  });
});

app.get('/address/:addrBase58', function (req, res) {
  res.render('address', {
    title: 'Address '+(req.params.addrBase58)+' - Bitcoin Explorer',
    address: req.params.addrBase58,
    account: req.addr.account,
    txs: req.addr.txs
  });
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  winston.info("Express server listening on port " + app.address().port);
}
