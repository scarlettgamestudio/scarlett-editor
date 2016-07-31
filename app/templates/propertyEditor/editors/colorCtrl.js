app.controller('ColorCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc',
    function ($scope, logSvc, config, scarlettSvc) {

        $scope.selectedColorHex = function () {
            return Color.rgbToHex($scope.model.bind.r * 255, $scope.model.bind.g * 255, $scope.model.bind.b * 255);
        };

        $scope.getPreviewStyle = function () {
            return {
                "background-color": "rgba(" +
                Math.round($scope.model.bind.r * 255) + "," +
                Math.round($scope.model.bind.g * 255) + "," +
                Math.round($scope.model.bind.b * 255) + "," +
                $scope.model.bind.a + ")"
            }
        };

        $scope.getPreviewStyleNoAlpha = function () {
            return {
                "background-color": "rgb(" +
                Math.round($scope.model.bind.r * 255) + "," +
                Math.round($scope.model.bind.g * 255) + "," +
                Math.round($scope.model.bind.b * 255) + ")"
            }
        };

    }
]);