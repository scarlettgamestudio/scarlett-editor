/**
 * Created by John
 */

app.factory("sceneSvc", function ($rootScope, constants) {
	var svc = {};

	svc._activeGameScene = null; // the active game scene, all operations on the scene should be made with this consideration
	svc._selectedObjects = [];

	/**
	 * sets the active game scene
	 * @param scene
	 */
	svc.setActiveGameScene = function(scene) {
		this._activeGameScene = scene;
	};

	/**
	 * gets the active game scene
	 * @returns {*|null}
	 */
	svc.getActiveGameScene = function() {
		return this._activeGameScene;
	};

	/**
	 * Add the given object to the selected scene
	 * @param gameObject
	 */
	svc.addGameObjectToScene = function(gameObject) {
		if(svc._activeGameScene === null) {
			// cannot add without a active scene..
			return;
		}

		var parent = null;

		// is there any object selected? if so, we will add it as a child (if it's only one)
		if(svc._selectedObjects.length === 1) {
			parent = svc._selectedObjects[0];
			parent.addChild(gameObject);
		} else {
			// since there is no parent, we add it directly to the scene container:
			svc._activeGameScene.addGameObject(gameObject);
		}

		// finally, broadcast this so other components know the game object was added to the scene:
		$rootScope.$broadcast(constants.EVENTS.GAME_OBJECT_ADDED, gameObject, parent);
	};

	/**
	 * set the selected game objects
	 * @param objects
	 */
	svc.setSelectedObjects = function(objects) {
		// update the selected objects object:
		svc._selectedObjects = objects;

		// broadcast the event so other components know
		$rootScope.$broadcast(constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, objects);
	};

	/**
	 * checks if a given object is already selected
	 * @param object
	 */
	svc.isObjectSelected = function(object) {
		return svc._selectedObjects.indexOf(object) >= 0;
	};

	/**
	 * clear the selected objects array
	 */
	svc.clearSelectedObjects = function() {
		svc._selectedObjects = [];
	};

	return svc;
});
