app.directive('gameCanvasContainer', function (constants, $timeout, gameSvc, sceneSvc, $compile) {
    return function (scope, element, attrs) {

        let canvasElem = gameSvc.createOrGetGameCanvas();
        element.append(canvasElem);

        $compile(canvasElem)(scope);

        $timeout(function () {
            let game = gameSvc.createOrGetGame();

            // is there a valid project scene available?
            if (!sceneSvc.getActiveGameScene()) {
                // nope, let's create a new one:
                scope.model.scene = new EditorGameScene({
                    game: game,
                    backgroundColor: Color.fromRGB(39, 41, 42)
                });
                sceneSvc.setActiveGameScene(scope.model.scene);

            } else {
                scope.model.scene = sceneSvc.getActiveGameScene();
            }

            let width = element[0].parentNode.clientWidth;
            let height = element[0].parentNode.clientHeight;

            scope.updateGameBoundries(width, height);

            scope.updateVisualZoom();
        });

    };
});