app.controller('PropertyEditorHandlerCtrl', ['$scope', 'logSvc', 'config',
	function ($scope, logSvc, config) {
		$scope.model = {
			value: null         // attention on the init function, the value will be assigned there
		};

		$scope.onValueChange = function () {
			$scope.syncValue($scope.container, $scope.property, $scope.model.value);
		};

		(function init() {
			if (!$scope.property.hasDifferentAssignments) {
				// ... almost done, we don't want to change the original, so we need to clone first:
				$scope.model.value = (JSON.parse(JSON.stringify($scope.getPropertyValue($scope.container, $scope.property))));
			}
		})();
	}
]);