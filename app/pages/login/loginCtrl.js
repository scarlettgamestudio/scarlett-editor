app.controller('LoginCtrl',
	['$rootScope', '$scope', 'logSvc', 'userSvc', 'config',
		function ($rootScope, $scope, logSvc, userSvc, config) {

			$scope.LOGIN_STATE = {
				NONE: 0,
				AUTHENTICATING: 1,
				AUTHENTICATED: 2,
				FAILED: 3
			};

			// scope variables
			$scope.loginState = $scope.LOGIN_STATE.NONE;
			$scope.auth = {
				identity: "",
				password: "",
				remember: true
			};

			/* events */

			(function init() {
				// initialization..
				var userInfo = userSvc.getUserInfo();
				if (userInfo) {
					$scope.auth = {
						identity: userInfo.details.username,
						password: "", // for now the load from storage will only work for the identity
						remember: true
					};
				}
			})();

			/* functions */

			$scope.login = function (isValid) {
				$scope.loginState = 0;
				if (isValid) {
					var identity = $scope.auth.identity;
					var password = $scope.auth.password;

					$scope.loginState = $scope.LOGIN_STATE.AUTHENTICATING;
					userSvc.login(identity, password).then(
						function (response) {
							// success..
							if ($scope.auth.remember) {
								// for the application to be able to auto-login the user provided that login was made
								// with success, the token needs to be saved so it can be re-used.
								userSvc.storeUserSession();
							}

							$scope.loginState = $scope.LOGIN_STATE.AUTHENTICATED;

							// proceed to the main view:
							$rootScope.changeView('main');
						},
						function (reason) {
							// operation failed..
							$scope.loginState = $scope.LOGIN_STATE.FAILED;
							logSvc.error(reason);
						}
					);
				}
			};
		}]
);

