app.controller('LoginCtrl',
	['$rootScope', '$scope', 'logSvc', 'soapSvc', 'config',
		function ($rootScope, $scope, logSvc, soapSvc, config) {

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

			// scope functions
			$scope.login = function (isValid) {
				$scope.loginState = 0;
				if (isValid) {
					$scope.loginState = $scope.LOGIN_STATE.AUTHENTICATING;

					soapSvc.invoke(config.API.ACTIONS.LOGIN, {
						identity: $scope.auth.identity,
						password: $scope.auth.password
					}).then(
						function (response) {
							if(response.result.code == config.API.RESULT.OK) {
								// success!
								$scope.loginState = $scope.LOGIN_STATE.AUTHENTICATED;

								$rootScope.changeView('main');
							} else {
								// failed!
								$scope.loginState = $scope.LOGIN_STATE.FAILED;
							}
						}, function (error) {
							$scope.loginState = $scope.LOGIN_STATE.FAILED;
							logSvc.error(error);
						});
				}
			};
		}]
);

