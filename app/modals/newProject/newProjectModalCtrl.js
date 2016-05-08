app.controller('NewProjectModalCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', 'dialogSvc', 'dataSvc', 'gameSvc', '$rootScope',
	function ($scope, logSvc, soapSvc, config, dialogSvc, dataSvc, gameSvc, $rootScope) {

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
			var gameProject = new GameProject($scope.model.projectName);

			var projectData = [
				{
					filename: "project.sc",
					content: JSON.stringify(gameProject, null, 4)
				}
			];

			var path = $scope.model.projectPath;
			path += (path.endsWith('/') || path.endsWith('\\') ? '' : '/') + $scope.model.projectName + '/';

			// call the interface to create the project:
			ScarlettInterface.createProject(path, projectData, function(result) {
				if(result === true) {
					// store the project information in the app data model
					dataSvc.store("projects", {name: $scope.model.projectName, path: path});
					dataSvc.save();

					// set the active project
					gameSvc.setActiveProject(gameProject);

					// show the main view
					$rootScope.changeView('main');
					$rootScope.$apply();

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

