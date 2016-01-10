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

			(function() {
				// initialization..
				var savedCredentials = userSvc.getUserCredentials();
				if (savedCredentials) {
					$scope.auth = {
						identity: savedCredentials.identity,
						password: savedCredentials.password,
						remember: true
					};
				}
			})();

			/* functions */

			// scope functions
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
								// the user chose to remember the account auth details so they must be saved within our
								// local storage:
								userSvc.saveUserCredentials(identity, password);
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

