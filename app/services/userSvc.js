/**
 * Created by John on 12/6/15.
 */

app.factory("userSvc", function ($q, config, logSvc, soapSvc, localStorageService) {
	var svc = {};
	var userInfo = null;
	var userCredentials = null;

	// initialization:
	(function () {
		var _userCredentials = localStorageService.get(config.LOCAL_STORAGE.KEYS.USER_CREDENTIALS);
		if (_userCredentials) {
			userCredentials = _userCredentials;
		}
	})();

	svc.logout = function() {
		// TODO: implement this..
	};

	svc.login = function (identity, password) {
		if(svc.isLoggedIn()) {
			logSvc.warn("User is already logged in. Discarding login request..");
			return $q.reject(false);
		}

		var defer = $q.defer();

		soapSvc.invoke(config.API.ACTIONS.LOGIN, {
			identity: identity,
			password: password
		}).then(
			function (response) {
				if(response.result.code == config.API.RESULT.OK) {
					userInfo = {
						token: response.usertoken,
						details: response.userdata
					};

					// success!
					defer.resolve(true);
				} else {
					// failed!
					defer.reject(response.result.code);
				}
			}, function (error) {
				// error happened..
				defer.reject(error);
			});

		return defer.promise;
	};

	svc.getUserToken = function() {
		if(!svc.isLoggedIn()) {
			logSvc.warn("There is no logged in user, can't load token. Discarding get token request..");
			return false;
		}

		return userInfo.token;
	};

	svc.saveUserCredentials = function(identity, password) {
		// FIXME: encrypt this information
		return localStorageService.set(config.LOCAL_STORAGE.KEYS.USER_CREDENTIALS, {identity: identity, password: password});
	};

	svc.isLoggedIn = function () {
		return userInfo != null;
	};

	svc.getUserInfo = function () {
		return userInfo;
	};

	svc.getUserCredentials = function() {
		return userCredentials;
	};

	return svc;
});
