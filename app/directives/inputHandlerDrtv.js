app.directive('inputHandler', function (constants, $timeout) {
    return function (scope, element, attrs) {

        element[0].onmousewheel = function (e) {
            if (scope.onCanvasWheel) {
                scope.onCanvasWheel(e);
            }
        };

        element[0].onclick = function (e) {
            if (scope.onCanvasClick) {
                scope.onCanvasClick(e);
            }
        };

        element[0].onmousedown = function (e) {
            if (scope.onCanvasMouseDown) {
                scope.onCanvasMouseDown(e);
            }
        };

        element[0].onmousemove = function (e) {
            if (scope.onCanvasMouseMove) {
                scope.onCanvasMouseMove(e);
            }
        };

        element[0].onmouseup = function (e) {
            if (scope.onCanvasMouseUp) {
                scope.onCanvasMouseUp(e);
            }
        };

        element[0].onmouseout = function (e) {
            if (scope.onCanvasMouseOut) {
                scope.onCanvasMouseOut(e);
            }
        };

    };
});