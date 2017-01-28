/**
 *
 */
GameObjectSelectionCommand = Undo.Command.extend({
    constructor: function (sceneSvc, oldValue, newValue) {
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.sceneSvc = sceneSvc;
    },
    execute: function () {
        this.sceneSvc._selectedObjects = this.newValue;
    },
    undo: function () {
        this.sceneSvc._selectedObjects = this.oldValue;
        EventManager.emit(AngularHelper.constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, this.sceneSvc._selectedObjects);
    },
    redo: function () {
        this.sceneSvc._selectedObjects = this.newValue;
        EventManager.emit(AngularHelper.constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, this.sceneSvc._selectedObjects);
    }
});