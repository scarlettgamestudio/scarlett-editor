app.controller('FilepathCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc',
    function ($scope, logSvc, config, scarlettSvc) {

        $scope.showFileSearch = function () {
            var params = {
                filters: [{name: '', extensions: ['*']}]
            };

            NativeInterface.openFileBrowser($scope.model.bind, params, function (path) {
                if (path) {
                    var projectPath = scarlettSvc.activeProjectPath;

                    // is this already part of the project?
                    if (path.indexOf(projectPath) < 0) {
                        // nope, we are going to copy the asset to the default assets folder

                    }

                    $scope.model.bind = path;
                    $scope.onValueChange();
                    $scope.$apply();
                }
            });
        };

    }
]);