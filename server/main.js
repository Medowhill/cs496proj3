import express from 'express';
import WebpackDevServer from 'webpack-dev-server';
import webpack from 'webpack';
 
const app = express();
const port = 3000;
const devPort = 8080;
const exec = require('child_process').exec;

var path = require('path');
var mime = require('mime');

var Db = require('mongodb').Db;
var MongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;
var db = new Db('test', new Server('localhost', 27017));
var collection;

db.open(function(err, db){
	if (err) throw err;
	collection = db.collection("files1");
});

if (process.env.NODE_ENV == 'development') {
    console.log('Server is running on development mode');
 
    const config = require('../webpack.dev.config');
    let compiler = webpack(config);
    let devServer = new WebpackDevServer(compiler, config.devServer);
    devServer.listen(devPort, () => {
        console.log('webpack-dev-server is listening on port', devPort);
    });
}

app.use('/', express.static(__dirname + '/../public'));
app.get('/jar', (req, res) => {
	var name = req.query.name;
	var fs = require('fs');
	fs.writeFile('Manifest', 'Manifest-Version: 1.0\nCreated-By: 1.8.0_111 (Oracle Corporation)\nMain-Class: ' + name + '\n', err => {
		if (err) throw err;
		exec('jar cfm ' + name + '.jar Manifest *.class', (error, stdout, stderr) => {
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
io.sockets.on('connection', socket => {
	console.log('conn');
	socket.on('list', data => {
		collection.find({}, {fields: {name : true}}).toArray((err, docs) => {
			if (err) throw err;
			socket.emit('list', {names: docs});
			socket.broadcast.emit('list', {names: docs});
		});
	});
	socket.on('change', data => {
		socket.broadcast.emit('change', data);
	});
	socket.on('save', data => {
		var fs = require('fs');
		fs.writeFile(data.name, data.code, err => {
	    	if (err) throw err;
	    	collection.update({name: data.name}, {name: data.name}, {upsert : true}, (err, item) => {
				if (err) throw err;
	    		collection.find({}, {fields: {name : true}}).toArray((err, docs) => {
					if (err) throw err;
					socket.emit('list', {names: docs});
					socket.broadcast.emit('list', {names: docs});
				});
	    	});
	    });
	});
	socket.on('run', data => {
		exec('javac ' + data.name, (error, stdout, stderr) => {
			if (error) {
				socket.emit('result', {result: error.toString()});
				return;
			}
			exec('java ' + data.name.substring(0, data.name.length - 5), (error, stdout, stderr) => {
				if (error) {
					socket.emit('result', {result: error.toString()});
					return;
				}
				socket.emit('result', {result: stdout});
			});
		});
	});
	socket.on('file', data => {
		var fs = require('fs');
		fs.readFile(data.name, (err, data) => {
			if (err) throw err;
			socket.emit('file', {code: data.toString()});
		});
	});
	socket.on('del', data => {
		collection.remove({name: data.name}, {single: true}, (err, num) => {
			if (err) throw err;
    		collection.find({}, {fields: {name : true}}).toArray((err, docs) => {
				if (err) throw err;
				socket.emit('list', {names: docs});
				socket.broadcast.emit('list', {names: docs});
			});
		});
		var fs = require('fs');
		fs.unlink(data.name, err => {});
		if (data.name.substring(data.name.length - 5, data.name.length) == '.java')
			fs.unlink(data.name.substring(0, data.name.length - 5) + '.class', err => {});
	});
});

server.listen(port);