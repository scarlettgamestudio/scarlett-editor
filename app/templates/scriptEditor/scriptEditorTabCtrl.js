app.controller('scriptEditorTabCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'constants',
    function ($scope, logSvc, config, scarlettSvc, constants) {

        $scope.model = {
            editor: null,
            changeCount: 0
        };

        $scope.aceLoaded = function (editor) {
            editor.session.setValue($scope.tab.content);

            $scope.model.editor = editor;

            $scope.$on(constants.EVENTS.CONTAINER_RESIZE, (function (e, id) {
                $scope.model.editor.resize();

            }).bind(this));
        };

        $scope.aceChanged = function () {
            $scope.model.changeCount++;
            $scope.tab.content = $scope.model.editor.session.getValue();

            // to make this more efficient, first we compare the string sizes since this operation requires no
            // complex computation:
            if ($scope.tab.content.length !== $scope.tab.savedContent.length) {
                $scope.tab.saved = false;

            } else {
                // then if the first validation can't provide any decisive info, we compare the strings semantically:
                $scope.tab.saved = $scope.tab.content === $scope.tab.savedContent;
            }
        };

    }]);