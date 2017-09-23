/**
 * GameObject Remove command
 */
GameObjectRemoveCommand = Undo.Command.extend({
    constructor: function (gameObjects) {
        this.gameObjects = gameObjects;
        this.gameObjectIndexTable = {};

        // save the positions:
        this.gameObjects.forEach((gameObject) => {
            this.gameObjectIndexTable[gameObject.getUID()] = gameObject.getIndex();
        });
    },

    execute: function () {
        AngularHelper.sceneSvc.removeGameObjectsFromScene(this.gameObjects);
    },

    undo: function () {
        this.gameObjects.forEach((gameObject) => {
            AngularHelper.sceneSvc.addGameObject(
                gameObject, gameObject.getParent(), this.gameObjectIndexTable[gameObject.getUID()]);
        });
    },

    redo: function () {
        this.execute();
    }
});