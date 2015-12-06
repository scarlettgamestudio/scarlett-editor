app.controller('LoginCtrl',
	function ($scope, logSvc, soapSvc, api) {
		// scope variables
		$scope.auth = {
			identity: "",
			password: "",
			remember: true
		};

		// scope functions
		$scope.login = function (isValid) {
			if (isValid) {
				soapSvc.invoke(api.ACTIONS.LOGIN, {
					identity: $scope.auth.identity,
					password: $scope.auth.password
				}).then(
					function (response) {
						logSvc.log(response);
					}, function (error) {
						logSvc.log(error);
					});
			}
		};
	}
);

