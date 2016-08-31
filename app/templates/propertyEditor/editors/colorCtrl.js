app.controller('ColorCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'constants',
    function ($scope, logSvc, config, scarlettSvc, constants) {

        // color individual values
        $scope.color = {
            r: 0, g: 0, b: 0, a: 1
        };

        // color picker string
        $scope.rgbaPicker = {
            color: ''
        };

        var updateColor = function (property, colorValue) {
            if ($scope.color[property] == undefined || colorValue == undefined) {
                return;
            }

            $scope.color[property] = colorValue;

            // picker selected color
            $scope.rgbaPicker.color = 'rgba(' + $scope.color.r + ',' + $scope.color.g + ',' + $scope.color.b + ',' + $scope.color.a + ')';
        };

        /**
         *
         */
        $scope.safeDigest = function() {
            !$scope.$$phase && $scope.$digest();
        };

        /**
         * Color picker on input changed event. Received color as an array of values
         */
        $scope.$on("onInputChanged", function (event, color) {
            if (!color || color["length"] == 0) {
                return;
            }

            // parse string to float and store color individual values
            $scope.color.r = parseFloat(color[0]);
            $scope.color.g = parseFloat(color[1]);
            $scope.color.b = parseFloat(color[2]);

            // normalize rgb (0 - 1) and store them
            $scope.model.bind.r = $scope.color.r / 255.0;
            $scope.model.bind.g = $scope.color.g / 255.0;
            $scope.model.bind.b = $scope.color.b / 255.0;

            // since we don't always have alpha (e.g., #fff), we should check if we have more than 3 elements
            if (color["length"] > 3) {
                $scope.color.a = parseFloat(color[3]);
                $scope.model.bind.a = $scope.color.a;
            } else {
                $scope.color.a = 1;
                $scope.model.bind.a = 1;
            }

            $scope.onValueChange();
            $scope.safeDigest();
        });

        // called when the color picker selected color changes
        $scope.onColorChanged = function (color) {
            // rgba string pattern
            var pattern = /rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)/;
            var result;

            // execute regex pattern and check for matches
            if ((result = pattern.exec(color)) !== null) {
                if (result.index === result.lastIndex) {
                    result.lastIndex++;
                }

                // parse string to float and store color individual values
                $scope.color.r = parseFloat(result[1]);
                $scope.color.g = parseFloat(result[2]);
                $scope.color.b = parseFloat(result[3]);
                $scope.color.a = parseFloat(result[4]);

                // normalize rgb (0 - 1) and store them
                $scope.model.bind.r = $scope.color.r / 255.0;
                $scope.model.bind.g = $scope.color.g / 255.0;
                $scope.model.bind.b = $scope.color.b / 255.0;
                $scope.model.bind.a = $scope.color.a;

                $scope.onValueChange();
            }
        };

        $scope.resetRBGAColor = function () {
            $scope.rgbaPicker.color = 'rgb(0.0, 0.0, 0.0, 1.0)';
            $scope.color = {r: 0, g: 0, b: 0, a: 1}
        };

        $scope.$on(constants.EVENTS.MODEL_UPDATED, function () {
            $scope.updateFromOrigin();
        });

        $scope.selectedColorHex = function () {
            return Color.rgbToHex($scope.model.bind.r * 255, $scope.model.bind.g * 255, $scope.model.bind.b * 255);
        };

        // when inspector value is changed
        $scope.prepareChange = function (property) {

            // color value ranging from 0 to 255
            var value255 = $scope.color[property];

            if (value255 == undefined || value255 == null) {
                value255 = 0;
            }

            // set property value
            $scope.model.bind[property] = value255;

            // if it is not alpha colour
            if (property != 'a') {
                // normalize (0 - 1)
                $scope.model.bind[property] /= 255.0;
            }

            // update picker's selected colour
            updateColor(property, value255);

            $scope.onValueChange(property);
        };

        $scope.getPreviewStyleNoAlpha = function () {
            return {
                "background-color": "rgb(" +
                Math.round($scope.color.r) + "," +
                Math.round($scope.color.g) + "," +
                Math.round($scope.color.b) + ")"
            }
        };

        $scope.updateFromOrigin = function () {
            $scope.color.r = $scope.hasMultipleDefinitions("r") ? null : $scope.model.bind.r * 255;
            $scope.color.g = $scope.hasMultipleDefinitions("g") ? null : $scope.model.bind.g * 255;
            $scope.color.b = $scope.hasMultipleDefinitions("b") ? null : $scope.model.bind.b * 255;
            $scope.color.a = $scope.hasMultipleDefinitions("a") ? null : $scope.model.bind.a;

            // set initial color picker values
            $scope.rgbaPicker.color = 'rgba(' + $scope.color.r + ',' + $scope.color.g + ',' + $scope.color.b + ',' + $scope.color.a + ')';
        };

        (function init() {
            $scope.updateFromOrigin();

        })();

    }
]);