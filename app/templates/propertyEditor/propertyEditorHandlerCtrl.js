app.controller('PropertyEditorHandlerCtrl', ['$scope', 'logSvc', 'config',
	function ($scope, logSvc, config) {
		$scope.model = {
			value: null         // attention on the init function, the value will be assigned there
		};

		$scope.hasMultipleDefinitions = function(propertyName) {
			if($scope.property.systemType === "object" && propertyName) {
				return ($scope.property.differentProperties.indexOf(propertyName) >= 0);
			} else {
				return $scope.property.hasDifferentAssignments;
			}
		};

		$scope.onValueChange = function (subPropertyName) {
			$scope.syncValue($scope.container, $scope.property, subPropertyName, $scope.model.value);
		};

		(function init() {
			// ... almost done, we don't want to change the original, so we need to clone first:
			$scope.model.value = (JSON.parse(JSON.stringify($scope.getPropertyValue($scope.container, $scope.property))));
		})();
	}
]);