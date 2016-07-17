app.controller('FilepathCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc',
    function ($scope, logSvc, config, scarlettSvc) {

        $scope.showFileSearch = function () {
            var params = {
                filters: [{name: '', extensions: ['*']}]
            };

            NativeInterface.openFileBrowser($scope.model.bind, params, function (path) {
                if (path) {
                    var projectPath = scarlettSvc.activeProjectPath;

                    $scope.model.bind = path;
                    $scope.onValueChange();
                    $scope.$apply();
                }
            });
        };

    }
]);