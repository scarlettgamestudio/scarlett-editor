app.directive('gameCanvas', function (constants, $timeout) {
	return function (scope, element, attrs) {

		function updateBoundries() {
			let width = element[0].parentNode.clientWidth;
			let height = element[0].parentNode.clientHeight;

			scope.updateGameBoundaries(width, height);
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

	};
});