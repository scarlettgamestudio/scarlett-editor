app.controller('FilepathCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc',
    function ($scope, logSvc, config, scarlettSvc) {

        $scope.showFileSearch = function () {
            var params = {
                filters: [{name: '', extensions: ['*']}]
            };

            NativeInterface.openFileBrowser($scope.model.bind, params, function (path) {
                if (path) {
                    var projectPath = scarlettSvc.activeProjectPath;

                    function done(path) {
                        var relativePath = path.replace(Path.wrapDirectoryPath(projectPath), "");

                        $scope.model.bind = relativePath;
                        $scope.onValueChange();
                        $scope.$apply();
                    }

                    // is this already part of the project?
                    if (path.indexOf(projectPath) < 0) {
                        // nope, we are going to copy the asset to the default assets folder
                        var newPath = Path.wrapDirectoryPath(projectPath) + Path.getFilename(path);

                        NativeInterface.copyFile(path, newPath, function(err) {
                            if(!err) {
                                // this was a success!
                                done(newPath);

                            } else {
                                // TODO: warn the user..
                            }
                        })
                    } else {
                        done(path);
                    }
                }
            });
        };

    }
]);