/**
 * Created by John
 */

app.factory("gameSvc", function ($rootScope, constants, logSvc, $compile) {
    let svc = {};

    // this map holds all the games associated by a generated unique id (key)
    svc._activeGame = null;
    svc._activeCanvas = null;
    svc._activeCanvasID = null;

    svc._extensions = {};

    /**
     * Removes a game
     */
    svc.removeGame = function () {
        if (isObjectAssigned(svc._activeGame)) {
            svc._activeGame.unload();
            svc._activeGame = null;
            svc._extensions = {};
        }
    };

    /**
     * Get a game
     */
    svc.getGame = function () {
        return svc._activeGame;
    };

    /**
     *
     * @returns {Object|*|null}
     */
    svc.getGameCanvas = function () {
        return svc._activeCanvas;
    };

    /**
     * creates a basic game object instance
     * @param name
     */
    svc.createGameObject = function (name) {
        name = name || "Game Object";

        return new GameObject({name: name});
    };

    /**
     * creates a sprite object instance
     * @param name
     */
    svc.createSpriteObject = function (name) {
        name = name || "Sprite";

        return new Sprite({name: name});
    };

    /**
     *
     */
    svc.createOrGetGameCanvas = function () {
        if (isObjectAssigned(svc._activeCanvas)) {
            return svc._activeCanvas;
        }

        svc._activeCanvasID = "game-canvas-" + generateUID();
        svc._activeCanvas = angular.element('<canvas id="' + svc._activeCanvasID + '" game-canvas input-handler tabindex="0"></canvas>');
        AngularHelper.activeCanvas = svc._activeCanvas[0];

        return svc._activeCanvas;
    };

    svc.addRenderExtension = function(name, extension) {
        if (!isObjectAssigned(svc._activeGame)) {
            logSvc.warn("Cannot assign a render extension to a non existent game");
            return;
        }
        svc._extensions[name] = extension;
        svc._activeGame.addRenderExtension(name, extension);
    };

    /**
     *
     * @param name
     */
    svc.getRenderExtension = function(name) {
        return svc._extensions[name];
    };

    /**
     * Initializes a game
     * @returns {Object}
     */
    svc.createOrGetGame = function () {
        if (isObjectAssigned(svc._activeGame)) {
            return svc._activeGame;
        }

        svc._activeGame = new Game({target: svc._activeCanvasID});
        svc._activeGame.init({ignoreInputHandler: true});

        let gridExtension = new GridExtension({game:  svc._activeGame});
        gridExtension.setGridColor(Color.fromRGB(49, 51, 52));

        svc.addRenderExtension(constants.RENDER_EXTENSIONS.GRID, gridExtension);

        // broadcast the game initialize event
        $rootScope.$broadcast(constants.EVENTS.GAME_INITIALIZE, svc._activeGame);

        return svc._activeGame;
    };

    return svc;
});
