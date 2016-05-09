const pjson = require('../package.json');
const fs = require('fs');
const os = require('os');

function ScarlettInterface() {}

ScarlettInterface.setupApplicationFolder = function() {
	var path = ScarlettInterface.getApplicationFolderPath();
	fs.exists(path, function(result) {
		if(!result) {
			// doesn't exist, create!
			fs.mkdir(path);
		}
	});
};

ScarlettInterface.createProject = function(path, data, callback) {
	var pathExists = fs.existsSync(path);

	if(!pathExists) {
		// doesn't exist, create!
		fs.mkdir(path);

		data.forEach(function(entry) {
			fs.writeFile((path + entry.filename), entry.content, function (err) {
				if (err) {
					return console.log(err);
				}
			});
		});

		callback(true);
	} else {
		// folder already exists...
		callback(1);
	}
};

ScarlettInterface.getApplicationFolderPath = function() {
	return os.homedir() + "/" + pjson.settings.applicationFolderName;
};

module.exports = ScarlettInterface;