app.controller('NavbarCtrl',
    ['$scope', 'logSvc', 'soapSvc', 'config', 'layoutSvc', 'sceneSvc', 'constants',
        function ($scope, logSvc, soapSvc, config, layoutSvc, sceneSvc, constants) {

            $scope.editGameScene = function() {
                EventManager.emit(AngularHelper.constants.EVENTS.OBJECTS_SELECTION, [sceneSvc.getActiveGameScene()]);
            };

            $scope.showConsole = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.CONSOLE);
            };

            $scope.showProjectExplorer = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.PROJECT_EXPLORER);
            };

            $scope.showSceneHierarchy = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.SCENE_HIERARCHY);
            };

            $scope.showAtlasEditor = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.ATLAS_EDITOR);
            };

            $scope.showSceneView = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.SCENE_VIEW);
            };

            $scope.showScriptEditor = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.SCRIPT_EDITOR);
            };

            $scope.showInspector = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.INSPECTOR);
            };

            $scope.safeDigest = function () {
                !$scope.$$phase && $scope.$digest();
            };

            $scope.canUndo = function () {
                return AngularHelper.commandHistory.canUndo();
            };

            $scope.canRedo = function () {
                return AngularHelper.commandHistory.canRedo();
            };

            $scope.undo = function () {
                if ($scope.canUndo()) {
                    AngularHelper.commandHistory.undo();
                    AngularHelper.rootScope.$broadcast(AngularHelper.constants.EVENTS.GAME_OBJECT_UPDATED);
                }
            };

            $scope.resetLayout = function() {
                layoutSvc.restoreToDefault();
            };

            $scope.isToolActive = function (id) {
                return EditorGameScene.activeTransformTool === id;
            };

            $scope.setActiveTool = function (id) {
                EditorGameScene.activeTransformTool = id;
            };

            $scope.redo = function () {
                if ($scope.canRedo()) {
                    AngularHelper.commandHistory.redo();
                    AngularHelper.rootScope.$broadcast(AngularHelper.constants.EVENTS.GAME_OBJECT_UPDATED);
                }
            };

            $scope.onCommandHistoryChanged = function() {
                $scope.safeDigest();
            };

            (function init() {
                EventManager.subscribe(AngularHelper.constants.EVENTS.COMMAND_HISTORY_CHANGED, $scope.onCommandHistoryChanged);

            })();

            $scope.$on("$destroy", (function () {
                EventManager.removeSubscription(AngularHelper.constants.EVENTS.COMMAND_HISTORY_CHANGED, $scope.onCommandHistoryChanged);

            }).bind(this));
        }]
);

