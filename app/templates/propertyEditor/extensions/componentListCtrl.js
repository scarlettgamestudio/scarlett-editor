app.controller('ComponentListCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'scriptsSvc',
	function ($scope, logSvc, config, scarlettSvc, scriptsSvc) {

		$scope.model = {
			isCollapsed: true,
			searchValue: "",
			source: []
		};

		$scope.toggleCollapsed = () => {
			$scope.model.isCollapsed = !$scope.model.isCollapsed;
		};

		$scope.updateSource = () => {
			$scope.model.source = Object.keys(scriptsSvc.getUserScripts());
		};

		$scope.onItemClicked = (componentName) => {
			alert(componentName);
		};

		$scope.onScriptsCompiled = () => {
			// update source:
			$scope.updateSource();
		};

		$scope.$on("$destroy", () => {
			EventManager.removeSubscription(AngularHelper.constants.EVENTS.SCRIPTS_COMPILED, $scope.onScriptsCompiled);
		});

		(() => {
			// init ...
			$scope.updateSource();

			// subscribe to scripts compiled event so whenever there is a script compilation the source is updated
			EventManager.subscribe(AngularHelper.constants.EVENTS.SCRIPTS_COMPILED, $scope.onScriptsCompiled, this);

		})();
	}
]);