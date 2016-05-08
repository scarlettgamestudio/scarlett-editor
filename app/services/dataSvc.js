/**
 * Created by John
 */

app.factory("dataSvc", function (config, logSvc, localStorageService) {
	var svc = {};
	var appData = {};

	svc.store = function(key, data) {
		if(!appData.hasOwnProperty(key)) {
			appData[key] = [];
		}

		appData[key].push(data);
	};

	svc.get = function (key) {
		return appData[key];
	};

	svc.delete = function(key) {
		if(appData.hasOwnProperty(key)) {
			delete appData[key];
		}
	};

	svc.save = function() {
		localStorageService.set(config.LOCAL_STORAGE.KEYS.APP_DATA, appData);
	};

	svc.resetData = function (save) {
		appData = {
			projects: []
		};

		if(save) {
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
