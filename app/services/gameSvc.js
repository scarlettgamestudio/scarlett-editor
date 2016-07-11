/**
 * Created by John
 */

app.factory("gameSvc", function () {
	var svc = {};

	// this map holds all the games associated by a generated unique id (key)
	svc._gameMap = {};

	// the active game scene, all operations on the scene should be made with this consideration
	svc._activeGameScene = null;

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
	 * Creates and associates a local game slot
	 */
	svc.createGame = function() {
		var uid = generateUID();

		// for now we simply assign the map key without any object
		svc._gameMap[uid] = null;

		return uid;
	};

	/**
	 * Removes a game
	 * @param uid
	 */
	svc.removeGame = function(uid) {
		if(svc._gameMap[uid]) {
			svc._gameMap[uid].unload();
			delete svc._gameMap[uid];
		}
	};

	/**
	 * Get a game
	 * @param uid
	 */
	svc.getGame = function(uid) {
		return svc._gameMap[uid];
	};

	/**
	 * Initializes a game
	 * @param uid
	 * @param settings
	 * @returns {boolean}
	 */
	svc.initializeGame = function(uid, settings) {
		if(!svc._gameMap.hasOwnProperty(uid)) {
			// the slot wasn't assigned yet..
			return false;
		}

		svc._gameMap[uid] = new Game(settings);
		svc._gameMap[uid].init();

		return true;
	};

	return svc;
});
