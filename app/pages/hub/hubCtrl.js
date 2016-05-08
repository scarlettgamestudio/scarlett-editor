app.controller('HubCtrl', ['$rootScope', '$scope', 'logSvc', 'userSvc', 'config', '$uibModal', 'dataSvc',
	function ($rootScope, $scope, logSvc, userSvc, config, $uibModal, dataSvc) {

		var activeModal = null;

		$scope.model = {
			projects: []
		};

		$scope.openNewProjectModal = function () {
			activeModal = $uibModal.open({
				animation: true,
				templateUrl: "modals/newProject/newProjectModal.html",
				controller: "NewProjectModalCtrl",
				size: 200
			});
		};

		$scope.logout = function () {
			// call of user service logout, it will handle ui view changes as well:
			userSvc.logout();
		};

		(function init() {
			$scope.model.projects = dataSvc.get("projects");
		})()

	}
]);