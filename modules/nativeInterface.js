const dialog = require('electron').dialog;
const pjson = require('../package.json');
const fs = require('fs');
const fse = require('fs-extra');
const pathUtils = require('path');
const ncp = require('copy-paste');

function NativeInterface() {
}

function getOpenCommandLine() {
    switch (process.platform) {
        case 'darwin' :
            return 'open';
        case 'win32' :
            return '';
        case 'win64' :
            return '';
        default :
            return 'xdg-open';
    }
}

NativeInterface.getSystemDirectorySlash = function () {
    switch (process.platform) {
        case 'win32' :
        case 'win64':
            return "\\";
        default:
            return "/";
    }
};

NativeInterface.copy = function (text, callback) {
    ncp.copy(text, callback);
};

NativeInterface.paste = function (callback) {
    ncp.paste(callback);
};

NativeInterface.saveFileDialog = function (defaultPath, params, callback) {
    params = params || {};
    params.filters = params.filters || {};
    dialog.showSaveDialog({
        defaultPath: defaultPath,
        filters: params.filters
    }, function (result) {
        if (result && result.length > 0) {
            callback(result);
        } else {
            callback(false);
        }
    })
};

NativeInterface.openFileBrowser = function (defaultPath, params, callback) {
    params = params || {};
    params.filters = params.filters || {};
    dialog.showOpenDialog({
        properties: ['openFile'],
        defaultPath: defaultPath,
        filters: params.filters
    }, function (result) {
        if (result && result.length > 0) {
            callback(result[0]);
        } else {
            callback(false);
        }
    })
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

NativeInterface.openFile = function (path) {
    var cmd = getOpenCommandLine();
    var exec = require('child_process').exec;
    exec(cmd + " \"" + path + "\"");
};

NativeInterface.mapDirectory = function (path, originalPath) {
    if (path[path.length - 1] == "\\" || path[path.length - 1] == "/") {
        path = path.substring(0, path.length - 1);
    }

    var directoryModel = {
        path: path,
        subdirectories: [],
        files: []
    };

    if (!originalPath) {
        originalPath = path;
    }

    fs.readdir(path, function (err, list) {
        if (err) return directoryModel;
        list.forEach(function (_path) {
            var fullpath = pathUtils.resolve(path, _path);
            fs.stat(fullpath, function (err, stat) {
                if (stat && stat.isDirectory()) {
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

NativeInterface.copyFile = function (source, target, callback) {
    fse.copy(source, target, function (err) {
        if (err) return callback(err);
        callback();
    });
};

NativeInterface.writeFile = function (path, content, callback) {
    fs.writeFile(path, content, function (err) {
        if (err) {
            console.log(err);
        }

        if (callback) {
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

module.exports = NativeInterface;