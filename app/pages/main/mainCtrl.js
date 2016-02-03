/**
 * Created by John on 12/12/15.
 */

app.controller('MainCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', 'userSvc', '$rootScope',
	function ($scope, logSvc, soapSvc, config, userSvc, $rootScope) {
		// initialization
		(function init() {
			$scope.userInfo = userSvc.getUserInfo();
		})();

		$scope.logout = function () {
			// call of user service logout, it will handle ui view changes as well:
			userSvc.logout();
		};
	}]
);

