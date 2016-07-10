app.directive('gameCanvas', function (constants) {
	return function (scope, element, attrs) {
		if(scope.getCanvasID) {
			// update the canvas id:
			element[0].id = scope.getCanvasID();
		}

		scope.$on(constants.EVENTS.CONTAINER_RESIZE, (function(e, id) {
			// is this of interest to us?
			if(id === "sceneView") {
				// ok, it is, let's update the values:
				var width = element[0].parentNode.clientWidth;
				var height = element[0].parentNode.clientHeight;

				scope.updateGameBoundries(width, height);
			}
		}).bind(this));

		// set the css class:
		element.addClass("game-canvas");
	};
});