app.controller('SceneViewCtrl', ['$scope', '$timeout', 'logSvc', 'config', 'scarlettSvc', 'gameSvc', 'sceneSvc', 'constants',
    function ($scope, $timeout, logSvc, config, scarlettSvc, gameSvc, sceneSvc, constants) {

        $scope.model = {
            visualZoom: 100,
            gameUID: null,
            canvasID: null,
            canvasElem: null,
            scene: null,
            lastWidth: null,
            lastHeight: null,
            extensions: {
                gridExtension: null
            }
        };

        $scope.$on(constants.EVENTS.GAME_SCENE_CHANGED, (function (e, scene) {
            $scope.model.scene = scene;

        }).bind(this));

        $scope.getCanvasID = function () {
            return $scope.model.canvasID;
        };

        $scope.updateGameBoundries = function (width, height) {
            let game = gameSvc.getGame($scope.model.gameUID);

            if (game) {
                // usually the width and height will be the same as the canvas container
                game.setVirtualResolution(width, height);

                $scope.lastWidth = width;
                $scope.lastHeight = height;
            }
        };

        $scope.safeDigest = function () {
            if (!$scope.$$phase) {
                $scope.$digest();
            }
        };

        $scope.getVisualCameraPosition = function () {
            if($scope.model.scene && $scope.model.scene.getCamera()) {
                return {
                    x: Math.round($scope.model.scene.getCamera().x),
                    y: Math.round($scope.model.scene.getCamera().y)
                };
            } else {
                return {
                    x: 0, y: 0
                }
            }
        };

        $scope.toggleGrid = function () {
            $scope.model.extensions.gridExtension.enabled = !$scope.model.extensions.gridExtension.enabled;
        };

        $scope.toggleSnapToGrid = function() {
            $scope.model.scene.snapToGrid = !$scope.model.scene.snapToGrid;

            if ($scope.model.scene.snapToGrid) {
                // update the grid size to guarantee the size is the same:
                $scope.model.scene.snapGridSize = $scope.model.extensions.gridExtension.getGridSize();
            }
        };

        $scope.updateVisualZoom = function () {
            $scope.model.visualZoom = Math.ceil(1 / $scope.model.scene.getCamera().zoom * 100);
            $scope.safeDigest();
        };

        $scope.onCanvasWheel = function (evt) {
            $scope.model.scene.onMouseWheel(evt);
            $scope.updateVisualZoom();
        };

        $scope.onCanvasClick = function (evt) {
            if (!isObjectAssigned($scope.model.scene)) {
                return;
            }

            // every time the canvas is clicked set this as the active scene
            sceneSvc.setActiveGameScene($scope.model.scene);
        };

        $scope.onCanvasMouseDown = function (evt) {
            // trigger mouse down event:
            $scope.model.scene.onMouseDown(evt);
            AngularHelper.activeCanvas = $scope.model.canvasElem;
            AngularHelper.focusElement(AngularHelper.activeCanvas);
        };

        $scope.onCanvasMouseMove = function (evt) {
            // trigger mouse move event:
            $scope.model.scene.onMouseMove(evt);
            $scope.safeDigest();
        };

        $scope.onCanvasMouseUp = function (evt) {
            // trigger mouse up event:
            $scope.model.scene.onMouseUp(evt);
        };

        $scope.onCanvasMouseOut = function (evt) {
            // trigger mouse out event:
            $scope.model.scene.onMouseOut(evt);
        };

        $scope.$on('$destroy', function () {
            // TODO: validate if this work
            gameSvc.removeGame($scope.model.gameUID);
        });

        function initialize() {
            gameSvc.initializeGame($scope.model.gameUID, {target: $scope.model.canvasID});

            let game = gameSvc.getGame($scope.model.gameUID);

            // is there a valid project scene available?
            if (!sceneSvc.getActiveGameScene()) {
                // nope, let's create a new one:
                $scope.model.scene = new EditorGameScene({
                    game: game,
                    backgroundColor: Color.fromRGB(39, 41, 42)
                });
                sceneSvc.setActiveGameScene($scope.model.scene);

            } else {
                $scope.model.scene = sceneSvc.getActiveGameScene();
                game.changeScene($scope.model.scene);

            }

            let gridExtension = new GridExt({game: game});
            gridExtension.setGridColor(Color.fromRGB(49, 51, 52));

            game.addRenderExtension("debug", gridExtension);

            $scope.model.extensions.gridExtension = gridExtension;

            // to be safe, if the last width/height was set, let's use them :)
            if ($scope.lastWidth != null && $scope.lastHeight != null) {
                $scope.updateGameBoundries($scope.lastWidth, $scope.lastHeight);
            }

            $scope.updateVisualZoom();

            EventManager.subscribe(AngularHelper.constants.EVENTS.VIEW_CHANGED, $scope.onViewChanged, this);

            $scope.$on("$destroy", function () {
                EventManager.removeSubscription(AngularHelper.constants.EVENTS.VIEW_CHANGED, $scope.onViewChanged);
            });

            $scope.model.canvasElem = document.getElementById($scope.model.canvasID);
            AngularHelper.activeCanvas = $scope.model.canvasElem;
        }

        $scope.onViewChanged = function() {
            $scope.updateVisualZoom();
        };

        $scope.model.gameUID = gameSvc.createGame();
        $scope.model.canvasID = "canvas_" + $scope.model.gameUID;

        // set this on timeout without a time value so it's executed when the content is loaded:
        $timeout(initialize);
    }
]);