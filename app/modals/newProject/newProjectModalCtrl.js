app.controller('NewProjectModalCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', 'dialogSvc', 'dataSvc', 'gameSvc', '$rootScope', '$uibModalInstance', 'scarlettSvc',
	function ($scope, logSvc, soapSvc, config, dialogSvc, dataSvc, gameSvc, $rootScope, $uibModalInstance, scarlettSvc) {
		
		$scope.model = {
			projectName: '',
			projectPath: ''
		};

		$scope.openFileBrowser = function() {
			NativeInterface.openDirectoryBrowser($scope.model.projectPath, function(result) {
				if(result) {
					$scope.model.projectPath = result;
					$scope.$digest();
				}
			});
		};

		$scope.close = function() {
			$uibModalInstance.dismiss('cancel');
		};

		$scope.createProject = function() {
			if(!NativeInterface.pathExists($scope.model.projectPath)) {
				dialogSvc.showDialog("Ups", "Please choose a valid project path", "alert");
				return;
			}

			if($scope.model.projectName.trim() === "") {
				dialogSvc.showDialog("Ups", "Please fill the project name before continuing", "alert");
				return;
			}

			// create the game project object
			var gameProject = scarlettSvc.generateProject($scope.model.projectName);

			var projectData = [
				{
					filename: "project.sc",
					content: JSON.stringify(gameProject, null, 4)
				}
			];

			var path = $scope.model.projectPath;
			path = Path.wrapDirectoryPath(path) + $scope.model.projectName + Path.TRAILING_SLASH;

			// call the interface to create the project:
			ScarlettInterface.createProject(path, projectData, function(result) {
				if(result === true) {
					// store the project information in the app data model
					dataSvc.push("projects", {name: $scope.model.projectName, path: path, lastUpdate: new Date().getTime()});
					dataSvc.save();

					// set the active project
					scarlettSvc.setActiveProject(gameProject);

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

