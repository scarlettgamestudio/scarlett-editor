const dialog = require('electron').dialog;
const pjson = require('../package.json');
const fs = require('fs');

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