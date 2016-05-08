app.controller('DialogModalCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', 'dialog', '$uibModalInstance',
	function ($scope, logSvc, soapSvc, config, dialog, $uibModalInstance) {

		$scope.model = {
			title: 'Dialog',
			body: '',
			type: "info"
		};

		$scope.close = function() {
			$uibModalInstance.dismiss('cancel');
		};

		(function init() {
			if(isObjectAssigned(dialog.title)) {
				$scope.model.title = dialog.title;
			}

			if(isObjectAssigned(dialog.body)) {
				$scope.model.body = dialog.body;
			}

			if(isObjectAssigned(dialog.type)) {
				$scope.model.type = dialog.type;
			}
		})();

	}
]);