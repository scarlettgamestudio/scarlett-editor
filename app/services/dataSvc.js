/**
 * Created by John
 */

app.factory("dataSvc", function (config, logSvc, localStorageService) {

    var MAX_ARRAY_LENGTH = 10;

    var svc = {};
    var appData = {};

    svc.push = function (key, data) {
        if (!appData.hasOwnProperty(key)) {
            appData[key] = [];
        } else if (!isArray(appData[key])) {
            return false;
        }

        appData[key].push(data);

        if (appData[key].length > MAX_ARRAY_LENGTH) {
            appData = appData.shift();
        }

        return true;
    };

    svc.findByProperty = function (key, property, value) {
        if (appData.hasOwnProperty(key)) {
            for(var i = 0; i < appData[key].length; i++) {
                if(appData[key][i][property] === value) {
                    return appData[key][i];
                }
            }
        }

        return null;
    };

    svc.get = function (key) {
        return appData[key];
    };

    svc.delete = function (key) {
        if (appData.hasOwnProperty(key)) {
            delete appData[key];
        }
    };

    svc.save = function () {
        localStorageService.set(config.LOCAL_STORAGE.KEYS.APP_DATA, appData);
    };

    svc.resetData = function (save) {
        appData = {
            projects: []
        };

        if (save) {
            svc.save();
        }
    };

    (function init() {
        var _appData = localStorageService.get(config.LOCAL_STORAGE.KEYS.APP_DATA);
        if (isObjectAssigned(_appData)) {
            appData = _appData;
        } else {
            svc.resetData(true);
        }
    })();

    return svc;
});
