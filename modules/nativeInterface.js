const dialog = require('electron').dialog;
const pjson = require('../package.json');
const fs = require('fs');
const pathUtils = require('path');

function NativeInterface() {
}

NativeInterface.openFileBrowser = function (defaultPath, params, callback) {
	params = params || {};
	params.filters = params.filters || {};
	dialog.showOpenDialog({properties: ['openFile'], filters: params.filters}, function (result) {
		if (result && result.length > 0) {
			callback(result[0]);
		} else {
			callback(false);
		}
	})
};

NativeInterface.mapDirectory = function (path, originalPath) {
	if(path[path.length-1] == "\\" || path[path.length-1] == "/") {
		path = path.substring(0, path.length-1);
	}

	var directoryModel = {
		path: path,
		subdirectories: [],
		files: []
	};

	if(!originalPath) {
		originalPath = path;
	}

	fs.readdir(path, function(err, list) {
		if(err) return directoryModel;
		list.forEach(function(_path) {
			var fullpath = pathUtils.resolve(path, _path);
			fs.stat(fullpath, function(err, stat) {
				if(stat && stat.isDirectory()) {
					directoryModel.subdirectories.push(NativeInterface.mapDirectory(fullpath, originalPath));
				} else {
					directoryModel.files.push({
						relativePath: fullpath.substring(originalPath.length + 1, fullpath.length), // +1 because of the bar
						fullPath: fullpath
					});
				}
			})
		});
	});

	return directoryModel;
};

NativeInterface.writeFile = function(path, content, callback) {
	 fs.writeFile(path, content, function (err) {
		if (err) {
			console.log(err);
		}

		if(callback) {
			callback(err ? false : true);
		}
	});
};

NativeInterface.readFile = function (path, callback) {
	fs.readFile(path, 'utf8', function (err, data) {
		if (err) {
			callback(false);
			return;
		}
		callback(data);
	});
};

NativeInterface.pathExists = function (path) {
	return fs.existsSync(path);
};

NativeInterface.openDirectoryBrowser = function (defaultPath, resultCallback) {
	dialog.showOpenDialog({defaultPath: defaultPath, properties: ['openDirectory']}, function (result) {
		if (result && result.length > 0) {
			resultCallback(result[0]);
		} else {
			resultCallback(false);
		}
	})
};

module.exports = NativeInterface;