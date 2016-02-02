/**
 * Created by John on 12/12/15.
 */

app.controller('MainCtrl',
	['$scope', 'logSvc', 'soapSvc', 'config', 'userSvc',
		function ($scope, logSvc, soapSvc, config, userSvc) {
			// initialization
			(function init() {
				$scope.userInfo = userSvc.getUserInfo();
			})();


		}]
);

