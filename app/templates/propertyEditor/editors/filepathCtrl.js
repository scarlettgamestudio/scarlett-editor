app.controller('FilepathCtrl', ['$scope', 'logSvc', 'config',
    function ($scope, logSvc, config) {

        $scope.showFileSearch = function () {
            var params = {
                filters: [{name: 'File Search', extensions: ['*']}]
            };

            NativeInterface.openFileBrowser($scope.model.bind, params, function (path) {
                if (path) {
                    $scope.model.bind = path;
                    $scope.onValueChange();
                    $scope.$apply();
                }
            });
        };

    }
]);