app.controller('SceneViewCtrl', ['$scope', '$timeout', 'logSvc', 'config', 'scarlettSvc', 'gameSvc', 'sceneSvc',
	function ($scope, $timeout, logSvc, config, scarlettSvc, gameSvc, sceneSvc) {

		$scope.model = {
			gameUID: null,
			canvasID: null,
			scene: null,
			lastWidth: null,
			lastHeight: null,
			extensions: {
				debug: null
			}
		};

		$scope.getCanvasID = function () {
			return $scope.model.canvasID;
		};

		$scope.updateGameBoundries = function (width, height) {
			var game = gameSvc.getGame($scope.model.gameUID);

			$scope.lastWidth = width;
			$scope.lastHeight = height;

			if (game) {
				// usually the width and height will be the same as the canvas container
				game.setVirtualResolution(width, height);
			}
		};

		$scope.onCanvasClick = function (evt) {
			// every time the canvas is clicked set this as the active scene
			sceneSvc.setActiveGameScene($scope.model.scene);
		};

		$scope.$on('$destroy', function () {
			// TODO: validate if this work
			gameSvc.removeGame($scope.model.gameUID);
		});

		function initialize() {
			gameSvc.initializeGame($scope.model.gameUID, {target: $scope.model.canvasID});

			var game = gameSvc.getGame($scope.model.gameUID);

			// is there a valid project scene available?
			if (!scarlettSvc.activeProject.editor.lastScene) {
				// nope, let's create a new one:
				$scope.model.scene = new EditorGameScene({
					game: game,
					backgroundColor: Color.fromRGB(39, 41, 42)
				});
			}

			game.changeScene($scope.model.scene);
			sceneSvc.setActiveGameScene($scope.model.scene);

			var debugExt = new DebugExt({game: game});
			debugExt.setGridColor(Color.fromRGB(49, 51, 52));

			game.addRenderExtension("debug", debugExt);

			$scope.model.extensions.debug = debugExt;

			// to be safe, if the last width/height was set, let's use them :)
			if($scope.lastWidth != null && $scope.lastHeight != null) {
				$scope.updateGameBoundries($scope.lastWidth, $scope.lastHeight);
			}
		}

		$scope.model.gameUID = gameSvc.createGame();
		$scope.model.canvasID = "canvas_" + $scope.model.gameUID;

		// set this on timeout without a time value so it's executed when the content is loaded:
		$timeout(initialize);
	}
]);