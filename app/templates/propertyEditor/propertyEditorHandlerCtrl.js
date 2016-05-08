app.controller('PropertyEditorHandlerCtrl', ['$scope', 'logSvc', 'config',
	function ($scope, logSvc, config) {
		$scope.model = {
			value: 0
		};
		
		$scope.syncValue = function () {
			if ($scope.property.bindOnce) {
				return;
			}

			var type = $scope.property.type.toLowerCase();
			if ($scope.property.setter) {
				var rule = SetterDictionary.getRule(type);
				if (rule) {
					var args = [];
					rule.forEach(function(entry) {
						if(isObjectAssigned($scope.model.value[entry])){
							args.push($scope.model.value[entry]);
						}
					});

					$scope.property.setter.apply($scope.target.target, args);
				} else {
					// TODO: log this to user
				}
			} else {
				$scope.target.target[$scope.property.name] = $scope.model.value;
			}
		};

		(function init() {
			var value;
			if ($scope.property.getter) {
				value = $scope.property.getter();
			} else {
				value = $scope.target.target[$scope.property.name];
			}

			// ... almost done, we don't want to change the original, so we need to clone first:
			$scope.model.value = (JSON.parse(JSON.stringify(value)));
		})();
	}
]);