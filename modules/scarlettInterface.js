const pjson = require('../package.json');
const fs = require('fs');
const os = require('os');

function ScarlettInterface() {
}

function getSystemDirectorySlash() {
    switch (process.platform) {
        case 'win32' :
        case 'win64':
            return "\\";
        default:
            return "/";
    }
}

ScarlettInterface.setupApplicationFolder = function () {
    var path = ScarlettInterface.getApplicationFolderPath();
    fs.exists(path, function (result) {
        if (!result) {
            // doesn't exist, create!
            fs.mkdir(path);
        }
    });
};

ScarlettInterface.createProject = function (path, data, callback) {
    var pathExists = fs.existsSync(path);

    if (!pathExists) {
        // doesn't exist, create!
        fs.mkdir(path);
        fs.mkdir(path + getSystemDirectorySlash() + ".scarlett");
        fs.mkdir(path + getSystemDirectorySlash() + "content");

        data.forEach(function (entry) {
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

ScarlettInterface.getApplicationFolderPath = function () {
    return os.homedir() + getSystemDirectorySlash() + pjson.settings.applicationFolderName;
};

module.exports = ScarlettInterface;