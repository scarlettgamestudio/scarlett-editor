/**
 * Created by John
 */

app.factory("gameSvc", function ($rootScope, constants) {
	var svc = {};

	// this map holds all the games associated by a generated unique id (key)
	svc._gameMap = {};

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
	 * creates a basic game object instance
	 * @param name
	 */
	svc.createGameObject = function(name) {
		name = name || "Game Object";

		return new GameObject({name: name});
	};

	/**
	 * creates a sprite object instance
	 * @param name
	 */
	svc.createSpriteObject = function(name) {
		name = name || "Sprite";

		return new Sprite({name: name});
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
		svc._gameMap[uid].init({ignoreInputHandler: true});

		// broadcast the game initialize event
		$rootScope.$broadcast(constants.EVENTS.GAME_INITIALIZE, svc._gameMap[uid]);

		return true;
	};

	return svc;
});
