
app.controller('scriptEditorTabCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'constants',
    function ($scope, logSvc, config, scarlettSvc, constants) {

        $scope.model = {
            editor: null
        };

        $scope.aceLoaded = function (editor) {
            $scope.model.editor = editor;

            $scope.$on(constants.EVENTS.CONTAINER_RESIZE, (function (e, id) {
                $scope.model.editor.resize();

            }).bind(this));
        };

        $scope.aceChanged = function() {

        };

}]);