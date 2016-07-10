app.controller('SceneViewCtrl', ['$scope', '$timeout', 'logSvc', 'config', 'scarlettSvc', 'gameSvc',
	function ($scope, $timeout, logSvc, config, scarlettSvc, gameSvc) {

		$scope.model = {
			gameUID: null,
			canvasID: null,
			scene: null
		};

		$scope.getCanvasID = function () {
			return $scope.model.canvasID;
		};

		$scope.updateGameBoundries = function(width, height) {
			var game = gameSvc.getGame($scope.model.gameUID);

			if(game) {
				// usually the width and height will be the same as the canvas container
				game.setVirtualResolution(width, height);
			}
		};

		$scope.$on('$destroy', function () {
			// TODO: validate if this work:
			gameSvc.removeGame($scope.model.gameUID);
		});

		function initialize() {
			gameSvc.initializeGame($scope.model.gameUID, {target: $scope.model.canvasID});

			var game = gameSvc.getGame($scope.model.gameUID);

			// is there a valid project scene available?
			if (!scarlettSvc.activeProject.editor.lastScene) {
				// nope, let's create a new one:
				$scope.model.scene = new GameScene({
					game: game,
					backgroundColor: Color.fromRGB(39, 41, 42)
				});
			}

			game.changeScene($scope.model.scene);
		}

		$scope.model.gameUID = gameSvc.createGame();
		$scope.model.canvasID = "canvas_" + $scope.model.gameUID;

		// set this on timeout without a time value so it's executed when the content is loaded:
		$timeout(initialize);
	}
]);