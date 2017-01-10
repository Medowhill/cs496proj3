'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _webpackDevServer = require('webpack-dev-server');

var _webpackDevServer2 = _interopRequireDefault(_webpackDevServer);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express2.default)();
var port = 3000;
var devPort = 8080;
var exec = require('child_process').exec;

var path = require('path');
var mime = require('mime');

var Db = require('mongodb').Db;
var MongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;
var db = new Db('test', new Server('localhost', 27017));
var collection;

db.open(function (err, db) {
	if (err) throw err;
	collection = db.collection("files1");
});

if (process.env.NODE_ENV == 'development') {
	console.log('Server is running on development mode');

	var config = require('../webpack.dev.config');
	var compiler = (0, _webpack2.default)(config);
	var devServer = new _webpackDevServer2.default(compiler, config.devServer);
	devServer.listen(devPort, function () {
		console.log('webpack-dev-server is listening on port', devPort);
	});
}

app.use('/', _express2.default.static(__dirname + '/../public'));
app.get('/jar', function (req, res) {
	var name = req.query.name;
	var fs = require('fs');
	fs.writeFile('Manifest', 'Manifest-Version: 1.0\nCreated-By: 1.8.0_111 (Oracle Corporation)\nMain-Class: ' + name + '\n', function (err) {
		if (err) throw err;
		exec('jar cfm ' + name + '.jar Manifest *.class', function (error, stdout, stderr) {
			if (error) throw error;
			var file = name + '.jar';
			var filename = path.basename(file);
			var mimetype = mime.lookup(file);
			res.setHeader('Content-disposition', 'attachment; filename=' + filename);
			res.setHeader('Content-type', mimetype);
			var stream = fs.createReadStream(file);
			stream.pipe(res);
		});
	});
});

var server = require('http').createServer(app);

var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket) {
	console.log('conn');
	socket.on('list', function (data) {
		collection.find({}, { fields: { name: true } }).toArray(function (err, docs) {
			if (err) throw err;
			socket.emit('list', { names: docs });
			socket.broadcast.emit('list', { names: docs });
		});
	});
	socket.on('change', function (data) {
		socket.broadcast.emit('change', data);
	});
	socket.on('save', function (data) {
		var fs = require('fs');
		fs.writeFile(data.name, data.code, function (err) {
			if (err) throw err;
			collection.update({ name: data.name }, { name: data.name }, { upsert: true }, function (err, item) {
				if (err) throw err;
				collection.find({}, { fields: { name: true } }).toArray(function (err, docs) {
					if (err) throw err;
					socket.emit('list', { names: docs });
					socket.broadcast.emit('list', { names: docs });
				});
			});
		});
	});
	socket.on('run', function (data) {
		exec('javac ' + data.name, function (error, stdout, stderr) {
			if (error) {
				socket.emit('result', { result: error.toString() });
				return;
			}
			exec('java ' + data.name.substring(0, data.name.length - 5), function (error, stdout, stderr) {
				if (error) {
					socket.emit('result', { result: error.toString() });
					return;
				}
				socket.emit('result', { result: stdout });
			});
		});
	});
	socket.on('file', function (data) {
		var fs = require('fs');
		fs.readFile(data.name, function (err, data) {
			if (err) throw err;
			socket.emit('file', { code: data.toString() });
		});
	});
	socket.on('del', function (data) {
		collection.remove({ name: data.name }, { single: true }, function (err, num) {
			if (err) throw err;
			collection.find({}, { fields: { name: true } }).toArray(function (err, docs) {
				if (err) throw err;
				socket.emit('list', { names: docs });
				socket.broadcast.emit('list', { names: docs });
			});
		});
		var fs = require('fs');
		fs.unlink(data.name, function (err) {});
		if (data.name.substring(data.name.length - 5, data.name.length) == '.java') fs.unlink(data.name.substring(0, data.name.length - 5) + '.class', function (err) {});
	});
});

server.listen(port);