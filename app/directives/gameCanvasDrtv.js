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

		element[0].onmousewheel = function(e) {
			if(scope.onCanvasWheel) {
				scope.onCanvasWheel(e);
			}
		};

		element[0].onclick = function (e) {
			if (scope.onCanvasClick) {
				scope.onCanvasClick(e);
			}
		};

		element[0].onmousedown = function(e) {
			if (scope.onCanvasMouseDown) {
				scope.onCanvasMouseDown(e);
			}
		};

		element[0].onmousemove = function(e) {
			if (scope.onCanvasMouseMove) {
				scope.onCanvasMouseMove(e);
			}
		};

		element[0].onmouseup = function(e) {
			if (scope.onCanvasMouseUp) {
				scope.onCanvasMouseUp(e);
			}
		};

		element[0].onmouseout = function(e) {
			if (scope.onCanvasMouseOut) {
				scope.onCanvasMouseOut(e);
			}
		};

		// set the css class:
		element.addClass("game-canvas");

		$timeout(updateBoundries);
	};
});