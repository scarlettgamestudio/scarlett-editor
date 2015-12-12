app.controller('RegisterCtrl',
	['$scope', 'logSvc', 'soapSvc', 'config',
		function ($scope, logSvc, soapSvc, config) {
			// scope variables
			$scope.userData = {
				identity: "",
				password: "",
				confirmPassword: "",
				email: ""
			};

			// scope functions
			$scope.register = function (isValid) {
				if (isValid) {
					soapSvc.invoke(config.API.ACTIONS.REGISTER, {
						username: $scope.userData.username,
						password: $scope.userData.password,
						email: $scope.userData.email
					}).then(
						function (response) {
							logSvc.log(response);
						}, function (error) {
							logSvc.log(error);
						});
				}
			};
		}]
);

