app.directive('gameCanvas', function (constants, $timeout) {
	return function (scope, element, attrs) {

		if (scope.getCanvasID) {
			// update the canvas id:
			element[0].id = scope.getCanvasID();
		}

		function updateBoundries() {
			var width = element[0].parentNode.clientWidth;
			var height = element[0].parentNode.clientHeight;

			scope.updateGameBoundries(width, height);
		}

		scope.$on(constants.EVENTS.CONTAINER_RESIZE, (function (e, id) {
			// is this of interest to us?
			if (id === "sceneView") {
				// ok, it is, let's update the values:
				updateBoundries();
			}
		}).bind(this));

		// set the css class:
		element.addClass("game-canvas");

		$timeout(updateBoundries);
	};
});