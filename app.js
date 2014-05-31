// Module dependencies.
global.Util = require('./util');

var express = require('express'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	errorHandler = require('errorhandler'),
	http = require('http'),
	winston = require('winston'),
	Step = require('step'),
	bitcoin = require('bitcoinjs'),
	RpcClient = require('jsonrpc2').Client,
	bigint = global.bigint = bitcoin.bigint,

	fs = require('fs'),
	init = require('bitcoinjs/daemon/init'),
	
	config = init.getConfig(),

	app = express(),
	server = http.createServer(app),

	rpcClient = new RpcClient(config.jsonrpc.port, config.jsonrpc.host, config.jsonrpc.username, config.jsonrpc.password),

	rpc = rpcClient.connectSocket();

rpc.on('connect', function() 
{
	var moduleSrc = fs.readFileSync(__dirname + '/query.js', 'utf8');
	rpc.call('definerpcmodule', ['explorer', moduleSrc], function (err) 
	{
		if (err) 
		{
			console.error('Error registering query module: '+err.toString());
		}
	});
});

// Configuration
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(bodyParser());
app.use(methodOverride());
app.use(express.static(__dirname + '/public'));

var env = process.env.NODE_ENV || 'development';
if ('development' == env)
{
	app.use(errorHandler({ dumpExceptions: true, showStack: true }));
}
else if ('production' == env)
{
	app.use(errorHandler());
}

// Params
app.param('blockHash', function (req, res, next, hash)
{
	hash = Util.decodeHex(hash).reverse();
	var hash64 = hash.toString('base64');
	rpc.call('explorer.blockquery', [hash64], function (err, data) 
	{
		if (err) 
		{
			return next(err);
		}

		req.block = data;

		next();
	});
});

app.param('txHash', function (req, res, next, hash)
{
	hash = Util.decodeHex(hash).reverse();
	var hash64 = hash.toString('base64');
	rpc.call('explorer.txquery', [hash64], function (err, tx) 
	{
		if (err) 
		{
			return next(err);
		}

		req.tx = tx;

		// TODO: Show side chain blocks containing this tx
		next();
	});
});

app.param('addrBase58', function (req, res, next, addr)
{
	var pubKeyHash = Util.addressToPubKeyHash(addr);
	req.pubKeyHash = pubKeyHash;
	var pubKeyHash64 = pubKeyHash.toString('base64');

	rpc.call('explorer.addrquery', [pubKeyHash64], function (err, addr) 
	{
		if (err) 
		{
			return next(err);
		}

		req.addr = addr;

		next();
	});
});

// Routes
app.get('/', function(req, res, next)
{
	rpc.call('explorer.indexquery', [10], function (err, result) 
	{
		if (err) 
		{
			next(err);
			return;
		}
		result.title = 'Home - Bitcoin Explorer';
		res.render('index', result);
	});
});

app.get('/block/:blockHash', function (req, res) 
{
	res.render('block', 
	{
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

app.get('/tx/:txHash', function (req, res) 
{
	res.render('transaction', 
	{
		title: ((req.tx.tx) ? ('Tx '+req.tx.tx.hash.substr(0, 10) + '... - Bitcoin Explorer') : 'Unknown tx'), 
		tx: req.tx.tx, 
		block: req.tx.block, 
		totalOut: req.tx.totalOut
	});
});

app.get('/address/:addrBase58', function (req, res) 
{
	res.render('address', 
	{
		title: 'Address '+ (req.params.addrBase58) + ' - Bitcoin Explorer',
		address: req.params.addrBase58,
		account: req.addr.account,
		txs: req.addr.txs
	});
});

// Only listen on $ node app.js
if (!module.parent) 
{
	server.listen(3000);
	winston.info("Express server listening on port " + server.address().port);
}
