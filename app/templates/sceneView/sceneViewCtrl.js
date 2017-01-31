app.controller('SceneViewCtrl', ['$scope', '$timeout', 'logSvc', 'config', 'scarlettSvc', 'gameSvc', 'sceneSvc', 'constants',
    function ($scope, $timeout, logSvc, config, scarlettSvc, gameSvc, sceneSvc, constants) {

        $scope.model = {
            visualZoom: 100,
            scene: null,
            lastWidth: null,
            lastHeight: null
        };

        $scope.$on(constants.EVENTS.GAME_SCENE_CHANGED, (function (e, scene) {
            $scope.model.scene = scene;

        }).bind(this));

        $scope.updateGameBoundaries = function (width, height) {
            let game = gameSvc.getGame();

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
            if ($scope.model.scene && $scope.model.scene.getCamera()) {
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

        $scope.isGridExtensionEnabled = function () {
            let gridExtension = gameSvc.getRenderExtension(constants.RENDER_EXTENSIONS.GRID);
            if (gridExtension) {
                return gridExtension.enabled;
            }
        };

        $scope.toggleGrid = function () {
            let gridExtension = gameSvc.getRenderExtension(constants.RENDER_EXTENSIONS.GRID);
            if (gridExtension) {
                gridExtension.enabled = !gridExtension.enabled;
            }
        };

        $scope.toggleSnapToGrid = function () {
            let gridExtension = gameSvc.getRenderExtension(constants.RENDER_EXTENSIONS.GRID);
            $scope.model.scene.snapToGrid = !$scope.model.scene.snapToGrid;

            if ($scope.model.scene.snapToGrid && gridExtension) {
                // update the grid size to guarantee the size is the same:
                $scope.model.scene.snapGridSize = gridExtension.getGridSize();
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

        function initialize() {
            EventManager.subscribe(AngularHelper.constants.EVENTS.VIEW_CHANGED, $scope.onViewChanged, this);
            EventManager.subscribe(AngularHelper.constants.EVENTS.LAYOUT_DESTROYED, $scope.onLayoutDestroyed, this);
        }

        $scope.onViewChanged = function () {
            $scope.updateVisualZoom();
        };

        $scope.onLayoutDestroyed = function () {
            EventManager.removeSubscription(AngularHelper.constants.EVENTS.VIEW_CHANGED, $scope.onViewChanged);
            EventManager.removeSubscription(AngularHelper.constants.EVENTS.LAYOUT_DESTROYED, $scope.onViewChanged);
        };

        // set this on timeout without a time value so it's executed when the content is loaded:
        $timeout(initialize);
    }
]);