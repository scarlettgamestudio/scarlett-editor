/**
 *
 */
GameObjectSelectionCommand = Undo.Command.extend({
    constructor: function (oldValue, newValue) {
        this.oldValue = oldValue;
        this.newValue = newValue;
    },
    execute: function () {
        AngularHelper.sceneSvc.setSelectedObjects(this.newValue, true, true);
    },
    undo: function () {
        AngularHelper.sceneSvc.setSelectedObjects(this.oldValue, true, true);
        EventManager.emit(AngularHelper.constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, AngularHelper.sceneSvc._selectedObjects);
    },
    redo: function () {
        AngularHelper.sceneSvc.setSelectedObjects(this.newValue, true, true);
        EventManager.emit(AngularHelper.constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, AngularHelper.sceneSvc._selectedObjects);
    }
});