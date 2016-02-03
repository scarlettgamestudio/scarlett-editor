/**
 * Created by John on 12/6/15.
 */

app.factory("userSvc", ['$q', 'config', 'logSvc', 'soapSvc', 'localStorageService', '$rootScope',
	function ($q, config, logSvc, soapSvc, localStorageService, $rootScope) {
		var svc = {};
		var userInfo = undefined;

		// initialization:
		(function init() {
			var _userInfo = localStorageService.get(config.LOCAL_STORAGE.KEYS.USER_INFO);
			if (isObjectAssigned(_userInfo)) {
				userInfo = _userInfo;
			}
		})();

		svc.clearUserInfo = function () {
			if (isObjectAssigned(userInfo)) {
				// clear the user info so it can't be used
				userInfo = undefined;
				return true;
			}

			logSvc.warn("Cannot clear user info, there is no data present.");

			return false;
		};

		svc.logout = function() {
			if (svc.clearUserInfo()) {
				// it only makes sense to redirect automatically the user to the login page so for now this
				// redirection will be applied without further action required.
				$rootScope.changeView('login');
			}
		};

		svc.login = function (identity, password) {
			if (svc.isLoggedIn()) {
				logSvc.warn("User is already logged in. Discarding login request..");
				return $q.resolve(true);
			}

			var defer = $q.defer();

			soapSvc.invoke(config.API.ACTIONS.LOGIN, {
				identity: identity,
				password: password
			}).then(
				function (response) {
					if (response.result.code == config.API.RESULT.OK) {
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

		svc.getUserToken = function () {
			if (!svc.isLoggedIn()) {
				logSvc.warn("There is no logged in user, can't load token. Discarding get token request..");
				return false;
			}

			return userInfo.token;
		};

		svc.storeUserSession = function () {
			/*  this shall store the relevant user information regarding this session.
			 notice that the stored session should have the access token for auto-login...
			 */
			if (isObjectAssigned(userInfo)) {
				var _userInfo = JSON.parse(JSON.stringify(userInfo)); // clone the object so we can safely modify it.
				_userInfo.token = ""; // clear the token before storing so it can't be used without a new login.

				return localStorageService.set(config.LOCAL_STORAGE.KEYS.USER_INFO, _userInfo);
			}

			return false;
		};

		svc.removeStoredUserSession = function () {
			return localStorageService.remove(config.LOCAL_STORAGE.KEYS.USER_INFO);
		};

		svc.isLoggedIn = function () {
			// FIXME: not good enough, should check for token validation too (locally)..
			return isObjectAssigned(userInfo) && isObjectAssigned(userInfo.token) && userInfo.token != "";
		};

		svc.getUserInfo = function (validateStorage) {
			if (isObjectAssigned(userInfo)) {
				return userInfo;
			} else if(validateStorage) {
				userInfo = localStorageService.get(config.LOCAL_STORAGE.KEYS.USER_INFO);
				return userInfo;
			} else {
				return undefined;
			}
		};

		svc.getToken = function () {
			if (isObjectAssigned(userInfo)) {
				return userInfo.token;
			}
			return null;
		};

		return svc;
	}]);
