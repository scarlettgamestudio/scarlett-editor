app.controller('ColorCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'constants',
    function ($scope, logSvc, config, scarlettSvc, constants) {

        $scope.color = {
            r: 0, g: 0, b: 0
        };

        $scope.$on(constants.EVENTS.MODEL_UPDATED, function() {
            $scope.updateFromOrigin();
        });

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

        $scope.prepareChange = function (property) {
            $scope.model.bind[property] = $scope.color[property] / 255.0;
            $scope.onValueChange(property);
        };

        $scope.getPreviewStyleNoAlpha = function () {
            return {
                "background-color": "rgb(" +
                Math.round($scope.model.bind.r * 255) + "," +
                Math.round($scope.model.bind.g * 255) + "," +
                Math.round($scope.model.bind.b * 255) + ")"
            }
        };

        $scope.updateFromOrigin = function() {
            $scope.color.r = $scope.hasMultipleDefinitions("r") ? null : $scope.model.bind.r * 255;
            $scope.color.g = $scope.hasMultipleDefinitions("g") ? null : $scope.model.bind.g * 255;
            $scope.color.b = $scope.hasMultipleDefinitions("b") ? null : $scope.model.bind.b * 255;
        };

        (function init() {
            $scope.updateFromOrigin();

        })();

    }
]);