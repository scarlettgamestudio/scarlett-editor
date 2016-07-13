/**
 * Created by John
 */

app.factory("sceneSvc", function () {
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

	};

	/**
	 * add an array of objects to the already selected list (if any)
	 * @param objects
	 */
	svc.addSelectedObjects = function(objects) {
		svc._selectedObjects = svc._selectedObjects.concat(objects);
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
