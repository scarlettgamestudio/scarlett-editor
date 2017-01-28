app.controller('NavbarCtrl',
    ['$scope', 'logSvc', 'soapSvc', 'config',
        function ($scope, logSvc, soapSvc, config) {

            $scope.$on(AngularHelper.constants.EVENTS.COMMAND_HISTORY_CHANGED, function() {
                $scope.safeDigest();
            });

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

            $scope.isToolActive = function (id) {
                return EditorGameScene.activeTransformTool == id;
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
        }]
);

