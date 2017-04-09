app.controller('NewProjectModalCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', 'dialogSvc', 'dataSvc', 'gameSvc', '$rootScope', '$uibModalInstance', 'scarlettSvc',
    function ($scope, logSvc, soapSvc, config, dialogSvc, dataSvc, gameSvc, $rootScope, $uibModalInstance, scarlettSvc) {

        $scope.model = {
            projectName: '',
            projectPath: ''
        };

        $scope.openFileBrowser = function () {
            NativeInterface.openDirectoryBrowser($scope.model.projectPath, function (result) {
                if (result) {
                    $scope.model.projectPath = result;
                    $scope.$digest();
                }
            });
        };

        $scope.close = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.createProject = function () {
            if (!NativeInterface.pathExists($scope.model.projectPath)) {
                dialogSvc.showDialog("Ups", "Please choose a valid project path", "alert");
                return;
            }

            if ($scope.model.projectName.trim() === "") {
                dialogSvc.showDialog("Ups", "Please fill the project name before continuing", "alert");
                return;
            }

            // create the game project object
            let projectFile = new ProjectFile({name: $scope.model.projectName});
            let workspaceFile = new WorkspaceFile();

            let projectData = [
                {
                    filename: ".scarlett/project.json",
                    content: Objectify.createDataString(projectFile, true)
                },
                {
                    filename: ".scarlett/workspace.json",
                    content: Objectify.createDataString(workspaceFile, true)
                }
            ];

            let path = $scope.model.projectPath;
            path = Path.wrapDirectoryPath(path) + $scope.model.projectName + Path.TRAILING_SLASH;

            // call the interface to create the project:
            ScarlettInterface.createProject(path, projectData, function (result) {
                if (result === true) {
                    // store the project information in the app data model
                    dataSvc.push("projects", {
                        name: $scope.model.projectName,
                        path: path,
                        lastUpdate: new Date().getTime()
                    });
                    dataSvc.save();

                    // set the active project
                    scarlettSvc.setActiveProject(projectFile);
                    scarlettSvc.setActiveProjectPath(path);
                    scarlettSvc.updateActiveProjectFileMap();

                    // show the main view
                    $rootScope.changeView('main');
                    $rootScope.$apply();

                    $scope.close();

                } else if (result === 1) {
                    dialogSvc.showDialog("Ups", "The file path '" + path + "' already exists", "alert");

                }
            });
        };

        (function init() {
            $scope.model.projectPath = ScarlettInterface.getApplicationFolderPath();
        })();
    }]
);

