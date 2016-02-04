/**
 * Created by John on 12/12/15.
 */

app.controller('MainCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', 'userSvc', '$rootScope',
	function ($scope, logSvc, soapSvc, config, userSvc, $rootScope) {

		$scope.changeContentView = function (view) {
			var validChange = true;

			switch (view) {
				case config.CONTENT_VIEWS.HOME:
					$scope.activeViewSrc = "pages/main/views/home.html";
					break;
				case config.CONTENT_VIEWS.PROJECTS:
					$scope.activeViewSrc = "pages/main/views/projects.html";
					break;
				default:
					validChange = false;
					break;
			}

			if (validChange) {
				$scope.activeView = view;
				$scope.safeDigest();
			}

			return validChange;
		};

		$scope.logout = function () {
			// call of user service logout, it will handle ui view changes as well:
			userSvc.logout();
		};

		$scope.safeDigest = function () {
			!$scope.$$phase && $scope.$digest();
		};

		// initialization
		(function init() {
			$scope.userInfo = userSvc.getUserInfo();
			$scope.views = config.CONTENT_VIEWS; // the allowed views to be selected

			$scope.changeContentView(config.DEFAULT_CONTENT_VIEW);
		})();
	}]
);

