app.controller('ContentBrowserModalCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', '$uibModalInstance',
    function ($scope, logSvc, soapSvc, config, $uibModalInstance) {

        $scope.model = {

        };

        $scope.close = function() {
            $uibModalInstance.dismiss('cancel');
        };

        (function init() {

        })();

    }
]);