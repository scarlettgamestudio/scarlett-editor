/**
 * EditorGameScene
 */
function EditorGameScene(params) {
	GameScene.call(this, params);

	// public properties:
	this.snapToGrid = false;
	this.snapGridSize = 24;

	// private properties:
	this._primitiveRender = new PrimitiveRender(this._game);
	this._colors = {
		selection: Color.fromRGBA(100.0, 149.0, 237.0, 0.275)
	};
	this._mat = mat4.create(); // temporary matrix that can be used in multiple situations
	this._startCameraPosition = null;
	this._selectedObjects = [];
	this._subjectsMethod = null;
	this._lastKeyboardState = Keyboard.getState();
	this._mouseState = {
		startPosition: null,
		lastPosition: null,
		startScreenPosition: null,
		button: null,
		dragging: false,
		cursor: "default"
	};
}

inheritsFrom(EditorGameScene, GameScene);

EditorGameScene.TRANSFORM_STATE = {
	MOVE: 1,
	MOVE_X: 2,
	MOVE_Y: 3,
	SCALE: 4,
	SCALE_X: 5,
	SCALE_Y: 6,
	SCALE_TOP_LEFT: 7,
	SCALE_TOP_RIGHT: 8,
	SCALE_BOTTOM_RIGHT: 9,
	SCALE_BOTTOM_LEFT: 10,
	SCALE_TOP: 11,
	SCALE_RIGHT: 12,
	SCALE_BOTTOM: 13,
	SCALE_LEFT: 14,
	ROTATE: 15,
	ORIGIN: 16
};

EditorGameScene.TRANSFORM_TOOL_OPTIONS = {
	SELECT: 1,
	MOVE: 2,
	ROTATE: 3,
	SCALE: 4
};

EditorGameScene.CURSOR_TYPES = {
	GRAB: "-webkit-grab",
	DEFAULT: "default",
	MOVE: "move",
	POINTER: "pointer",
	NWSE_RESIZE: "nwse-resize",
	NESW_RESIZE: "nesw-resize",
	NS_RESIZE: "ns-resize",
	EW_RESIZE: "ew-resize"
};

EditorGameScene.DIMENSIONS = {
	ARTIFACT_RECTANGLE_BULK: 8,
	MOUSE_COLLISION_BULK: 2
};

EditorGameScene.CONSTANTS = {
	KEYBOARD_MOVE_INTENSITY: 0.8
};

/** static variables **/
EditorGameScene.activeTransformTool = EditorGameScene.TRANSFORM_TOOL_OPTIONS.SELECT;

/** static functions **/

/** public functions **/

EditorGameScene.prototype.initialize = function () {
	// add subscriptions:
	EventManager.subscribe(AngularHelper.constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, this._gameObjectsSelectionChanged, this);
};

EditorGameScene.prototype.unload = function () {
	// remove subscriptions:
	EventManager.removeSubscription(AngularHelper.constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, this._gameObjectsSelectionChanged);

	// call parent unload
	GameScene.prototype.unload.call(this);
};

/**
 * Mouse wheel event
 * @param evt
 */
EditorGameScene.prototype.onMouseWheel = function (evt) {
	var wheelY = evt.deltaY;
	this._camera.zoom += 0.032 * (wheelY > 0 ? 1 : -1) * this._camera.zoom;
	this._camera.zoom = MathHelper.clamp(this._camera.zoom, 0.01, 8.0);
};

/**
 * Mouse Down Event
 * @param evt
 */
EditorGameScene.prototype.onMouseDown = function (evt) {
	// initialize mouse state for new dragging
	this._mouseState.startPosition = this._camera.screenToWorldCoordinates(evt.offsetX, evt.offsetY);
	this._mouseState.lastPosition = this._mouseState.startPosition;
	this._mouseState.button = evt.button;
	this._mouseState.dragging = true;
	this._mouseState.startScreenPosition = new Vector2(evt.offsetX, evt.offsetY);
	//console.log(this._mouseState.startPosition.x + ":" + this._mouseState.startPosition.y);

	switch (evt.button) {
		// left button:
		case 0:
			if (this._selectedObjects.length > 0) {
				var method = this._handleMouseArtifactCollision(evt);
				// is there something that we should take care of?
				if (method) {
					this._subjectsMethod = method;
					this._refreshSelectedObjectsData();
				}
			}
			break;

		// middle button:
		case 1:
			this._mouseState.cursor = EditorGameScene.CURSOR_TYPES.GRAB;
			break;

		default:
			this._mouseState.cursor = EditorGameScene.CURSOR_TYPES.DEFAULT;
			break;
	}

	// update the cursor graphic
	this._updateCursorGraphic();

	// store the current camera position
	this._setStartCameraPosition();
};

/**
 * Mouse Move Event
 * @param evt
 */
EditorGameScene.prototype.onMouseMove = function (evt) {
	var handled = false; // when true, "further" operations shall take this in consideration as it means something is already being operated

	if (this._mouseState.dragging) {
		this._mouseState.lastPosition = this._camera.screenToWorldCoordinates(evt.offsetX, evt.offsetY);

		// middle button?
		if (!handled && this._mouseState.button == 1) {
			this._camera.x = this._startCameraPosition.x + ((this._mouseState.startScreenPosition.x - evt.offsetX) * this._camera.zoom);
			this._camera.y = this._startCameraPosition.y + ((this._mouseState.startScreenPosition.y - evt.offsetY) * this._camera.zoom);

			handled = true;
		}

		// left button?
		if (!handled && this._mouseState.button == 0) {
			if (this._subjectsMethod == null) {
				// handle selection
				this._handleSelection(false, false, true);

			} else {
				// update any necessary selected subjects:
				this._updateSubjects(evt);

			}

			handled = true;
		}
	}

	// test for editor artifact collisions?
	if (!handled && this._selectedObjects.length > 0 && this._subjectsMethod == null) {
		this._handleMouseArtifactCollision(evt);
	}
};

/**
 * Mouse Out Event
 * @param evt
 */
EditorGameScene.prototype.onMouseOut = function (evt) {
	// if it's not selecting (left button), clear the dragging state:
	if (this._mouseState.button !== 0) {
		this._mouseState.dragging = false;
	}

	this._mouseState.cursor = EditorGameScene.CURSOR_TYPES.DEFAULT;
	this._updateCursorGraphic();
	this._clearSubjectsMethod();
};

/**
 * Mouse Up Event
 * @param evt
 */
EditorGameScene.prototype.onMouseUp = function (evt) {
	// click ?
	if (this._mouseState.startPosition != null && this._mouseState.lastPosition != null &&
		Vector2.sqrDistance(this._mouseState.lastPosition, this._mouseState.startPosition) < 16) {
		// left mouse button?
		if (this._mouseState.button == 0) {
			// handle selection:
			this._handleSelection(true, true);
		}
	}

	this._mouseState.dragging = false;
	this._mouseState.cursor = EditorGameScene.CURSOR_TYPES.DEFAULT;

	this._updateCursorGraphic();
	this._clearSubjectsMethod();
};

/**
 * Update handler
 * @param delta
 */
EditorGameScene.prototype.update = function (delta) {
	this._handleKeyboardInput(delta);
	this._handleMouseUpdate(delta);
};

/**
 * Update handler
 * @param delta
 */
EditorGameScene.prototype.lateRender = function (delta) {
	this._renderMouse(delta);
	this._renderSelectedObjectsArtifacts(delta);
};

EditorGameScene.prototype.setSelectedObjects = function (gameObjects, broadcast, disableSelectionHistory) {
	var selected = [];
	gameObjects.forEach(function (elem) {
		selected.push({
			gameObject: elem,
			originalTransform: elem.transform.clone(),
			equals: function (other) {
				return other.gameObject && other.gameObject.getUID() == this.gameObject.getUID();
			}
		})
	});

	// add to current selection (ctrl key is being pressed) ?
	if (Keyboard.isKeyDown(Keys.Ctrl)) {
		selected.forEach((function (node) {
			// now we need to verify if the node is already selected, if so, we must toggle it (remove it)
			var idx = this._selectedObjects.indexOfObject(node);
			console.log(node);
			if (idx >= 0) {
				this._selectedObjects.splice(idx, 1);
			} else {
				this._selectedObjects.push(node);
			}
		}).bind(this));

		// also, we need to add to convert with the old ones so they are also in the broadcast:
		gameObjects = [];
		this._selectedObjects.forEach(function (node) {
			gameObjects.push(node.gameObject);
		});

	} else {
		// nope, simply set:
		this._selectedObjects = selected;
	}

	if (broadcast) {
		AngularHelper.sceneSvc.setSelectedObjects(gameObjects, true, disableSelectionHistory);
		EventManager.emit(AngularHelper.constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, gameObjects, this.getUID());
	}
};

/** private functions **/

EditorGameScene.prototype._handleKeyboardInput = function (delta) {
	var keyboardState = Keyboard.getState();
	var sceneOperations = 0;

	// is the canvas focused?
	if (AngularHelper.isActiveCanvasFocused()) {
		if (keyboardState.isKeyDown(Keys.W)) {
			this._camera.y -= Math.floor(EditorGameScene.CONSTANTS.KEYBOARD_MOVE_INTENSITY * this._camera.zoom * delta);
			sceneOperations++;
		} else if (keyboardState.isKeyDown(Keys.S)) {
			this._camera.y += Math.floor(EditorGameScene.CONSTANTS.KEYBOARD_MOVE_INTENSITY * this._camera.zoom * delta);
			sceneOperations++;
		}

		if (keyboardState.isKeyDown(Keys.A)) {
			this._camera.x -= Math.floor(EditorGameScene.CONSTANTS.KEYBOARD_MOVE_INTENSITY * this._camera.zoom * delta);
			sceneOperations++;
		} else if (keyboardState.isKeyDown(Keys.D)) {
			this._camera.x += Math.floor(EditorGameScene.CONSTANTS.KEYBOARD_MOVE_INTENSITY * this._camera.zoom * delta);
			sceneOperations++;
		}

		if (keyboardState.isKeyDown(Keys.D0) && !this._lastKeyboardState.isKeyDown(Keys.D0)) {
			this._camera.zoom = 1;
			sceneOperations++;
		}
	}

	if (sceneOperations > 0) {
		EventManager.emit(AngularHelper.constants.EVENTS.VIEW_CHANGED);
	}

	this._lastKeyboardState = Keyboard.getState();
};

EditorGameScene.prototype._gameObjectsSelectionChanged = function (selected, origin) {
	if (!origin || origin != this.getUID()) {
		this.setSelectedObjects(selected);
	}
};

EditorGameScene.prototype._scaleSubject = function (subject, mx, my, scaleX, scaleY, invertX, invertY) {
	// note: change mouse coordinates (controller) to world coordinates..
	var direction = subject.gameObject.transform.getRotation();
	var normDirection = direction % MathHelper.PI2;
	var baseWidth = subject.gameObject.getBaseWidth();
	var baseHeight = subject.gameObject.getBaseHeight();
	var origin = subject.gameObject.getOrigin();

	if (this.snapToGrid) {
		mx -= mx % this.snapGridSize;
		my -= my % this.snapGridSize;
	}

	// should invert the offsets?
	mx = invertX ? -mx : mx;
	my = invertY ? -my : my;

	// invert the axis ?
	if (Math.abs(normDirection) > MathHelper.PIo2 && Math.abs(normDirection) < MathHelper.PI + MathHelper.PIo2) {
		// the rectangle is rotated between 180º and 360º which means we have to invert the axis to match the
		// calculations bellow:
		mx *= -1;
		my *= -1;
	}

	// sum the direction of the mouse movement to the existing in the object:
	direction += Math.atan2(my, mx);

	var h = Math.sqrt((mx * mx) + (my * my)); // in here we get the hypotenuse of the offset movement
	var ox = scaleX ? (invertX ? -h : h) * Math.cos(direction) : 0;
	var oy = scaleY ? (invertY ? -h : h) * Math.sin(direction) : 0;

	var newScaleX = subject.originalTransform.getScale().x + mx / baseWidth;
	var newScaleY = subject.originalTransform.getScale().y + my / baseHeight;

	subject.gameObject.transform.setPosition(
		Math.round(subject.originalTransform.getPosition().x + ox * (invertX ? 1 - origin.x : origin.x)),  //((ox * (scaleX ? (invertX ? 1 - origin.x : origin.x) : 0.5)) * (invertX ? -1 : 1))),
		Math.round(subject.originalTransform.getPosition().y + oy * (invertY ? 1 - origin.y : origin.y)) //((oy * (scaleY ? (invertY ? 1 - origin.y : origin.y) : 0.5)) * (invertY ? -1 : 1)))
	);

	// set the new scale value:
	subject.gameObject.transform.setScale(
		scaleX ? newScaleX : subject.originalTransform.getScale().x,
		scaleY ? newScaleY : subject.originalTransform.getScale().y
	);
};

EditorGameScene.prototype._updateSubjects = function (evt) {
	var broadcastChange = false;
	var diffx = (this._mouseState.lastPosition.x - this._mouseState.startPosition.x);
	var diffy = (this._mouseState.lastPosition.y - this._mouseState.startPosition.y);

	// TODO: fix scale while object is rotated...
	//console.log("LEPOS. " + JSON.stringify(this._mouseState.startPosition) + "-" + JSON.stringify(this._mouseState.lastPosition));

	this._selectedObjects.forEach((function (subject) {

		switch (this._subjectsMethod) {
			case EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM:
				this._scaleSubject(subject, diffx, diffy, false, true, false, false);
				broadcastChange = true;
				break;

			case EditorGameScene.TRANSFORM_STATE.SCALE_TOP:
				this._scaleSubject(subject, diffx, diffy, false, true, false, true);
				broadcastChange = true;
				break;

			case EditorGameScene.TRANSFORM_STATE.SCALE_RIGHT:
				this._scaleSubject(subject, diffx, diffy, true, false, false, false);
				broadcastChange = true;
				break;

			case EditorGameScene.TRANSFORM_STATE.SCALE_LEFT:
				this._scaleSubject(subject, diffx, diffy, true, false, true, false);
				broadcastChange = true;
				break;

			case EditorGameScene.TRANSFORM_STATE.SCALE_TOP_LEFT:
				this._scaleSubject(subject, diffx, diffy, true, true, true, true);
				broadcastChange = true;
				break;

			case EditorGameScene.TRANSFORM_STATE.SCALE_TOP_RIGHT:
				this._scaleSubject(subject, diffx, diffy, true, true, false, true);
				broadcastChange = true;
				break;

			case EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM_RIGHT:
				this._scaleSubject(subject, diffx, diffy, true, true, false, false);
				broadcastChange = true;
				break;

			case EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM_LEFT:
				this._scaleSubject(subject, diffx, diffy, true, true, true, false);
				broadcastChange = true;
				break;

			case EditorGameScene.TRANSFORM_STATE.MOVE:
				var newX = Math.round(subject.originalTransform.getPosition().x - ((this._mouseState.startScreenPosition.x - evt.offsetX) * this._camera.zoom));
				var newY = Math.round(subject.originalTransform.getPosition().y - ((this._mouseState.startScreenPosition.y - evt.offsetY) * this._camera.zoom));

				if (this.snapToGrid) {
					newX -= newX % this.snapGridSize;
					newY -= newY % this.snapGridSize;
				}

				subject.gameObject.transform.setPosition(newX, newY);

				broadcastChange = true;
				break;
		}
	}).bind(this));

	if (broadcastChange) {
		AngularHelper.rootScope.$broadcast(AngularHelper.constants.EVENTS.GAME_OBJECT_UPDATED);
	}
};

EditorGameScene.prototype._clearSubjectsMethod = function () {
	// before unsetting the method, check if we need to save any state:
	if (this._subjectsMethod) {
		this._onSubjectMethodOver();
	}

	this._subjectsMethod = null;
};

/**
 * Generates artifact data (boundaries and individual info for each artifact)
 * @param gameObject
 * @private
 */
EditorGameScene.prototype._generateGameObjectArtifactData = function (gameObject, asArray) {
	var artifacts = asArray ? [] : {};
	var bulk = EditorGameScene.DIMENSIONS.ARTIFACT_RECTANGLE_BULK * this._camera.zoom;
	var boundary = gameObject.getBoundary();

	var topMiddlePosition = new Vector2((boundary.topLeft.x + boundary.topRight.x) / 2.0, (boundary.topLeft.y + boundary.topRight.y) / 2.0);
	var leftMiddlePosition = new Vector2((boundary.topLeft.x + boundary.bottomLeft.x) / 2.0, (boundary.topLeft.y + boundary.bottomLeft.y) / 2.0);
	var bottomMiddlePosition = new Vector2((boundary.bottomLeft.x + boundary.bottomRight.x) / 2.0, (boundary.bottomLeft.y + boundary.bottomRight.y) / 2.0);
	var rightMiddlePosition = new Vector2((boundary.bottomRight.x + boundary.topRight.x) / 2.0, (boundary.bottomRight.y + boundary.topRight.y) / 2.0);

	// note: the higher the priority value, the "more priority" it has
	var artifactDictionary = [
		{
			name: "ORIGIN",
			origin: gameObject.transform.getPosition(),
			priority: 5,
			method: EditorGameScene.TRANSFORM_STATE.ORIGIN
		}
	];

	if (this._isScaleEnabled()) {
		artifactDictionary = artifactDictionary.concat([
			{
				name: "SCALE_TOP_LEFT",
				origin: boundary.topLeft,
				priority: 3,
				method: EditorGameScene.TRANSFORM_STATE.SCALE_TOP_LEFT
			},
			{
				name: "SCALE_TOP_RIGHT",
				origin: boundary.topRight,
				priority: 3,
				method: EditorGameScene.TRANSFORM_STATE.SCALE_TOP_RIGHT
			},
			{
				name: "SCALE_BOTTOM_RIGHT",
				origin: boundary.bottomRight,
				priority: 3,
				method: EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM_RIGHT
			},
			{
				name: "SCALE_BOTTOM_LEFT",
				origin: boundary.bottomLeft,
				priority: 3,
				method: EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM_LEFT
			},
			{
				name: "SCALE_TOP",
				origin: topMiddlePosition,
				priority: 3,
				method: EditorGameScene.TRANSFORM_STATE.SCALE_TOP
			},
			{
				name: "SCALE_RIGHT",
				origin: rightMiddlePosition,
				priority: 3,
				method: EditorGameScene.TRANSFORM_STATE.SCALE_RIGHT
			},
			{
				name: "SCALE_BOTTOM",
				origin: bottomMiddlePosition,
				priority: 3,
				method: EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM
			},
			{
				name: "SCALE_LEFT",
				origin: leftMiddlePosition,
				priority: 3,
				method: EditorGameScene.TRANSFORM_STATE.SCALE_LEFT
			}
		]);
	}

	artifactDictionary.forEach(function (elem) {
		var obj = {
			name: elem.name,
			boundary: Boundary.fromVector2(elem.origin, bulk),
			priority: elem.priority,
			gameObject: gameObject,
			method: elem.method
		};

		if (asArray) {
			artifacts.push(obj);
		} else {
			artifacts[elem.name] = obj;
		}
	});

	return artifacts;
};

/**
 * Handles the cursor interaction with the selected game objects transform artifacts
 * @param evt
 * @private
 */
EditorGameScene.prototype._handleMouseArtifactCollision = function (evt) {
	var worldPosition = this._camera.screenToWorldCoordinates(evt.offsetX, evt.offsetY);
	var mouseBoundary = Boundary.fromVector2(worldPosition, EditorGameScene.DIMENSIONS.MOUSE_COLLISION_BULK);
	var bulk = EditorGameScene.DIMENSIONS.ARTIFACT_RECTANGLE_BULK * this._camera.zoom;
	var method = null;

	// let's check on all the game scene game objects if there is a selection collision detected:
	this._selectedObjects.forEach((function (selected) {
		var activeArtifact = null;
		if (selected.gameObject.collidesWithPoint(worldPosition)) {
			var artifactData = this._generateGameObjectArtifactData(selected.gameObject, true);

			// ok, without further considerations, let's apply the default method (MOVE) if enabled
			if (this._isMoveEnabled()) {
				method = EditorGameScene.TRANSFORM_STATE.MOVE;
			}

			// now we test the collision for each artifact data:
			artifactData.forEach((function (artifact) {
				// is this a valid candidate?
				if (activeArtifact == null || artifact.priority > activeArtifact.priority) {
					// is the mouse boundary overlapping?
					if (Boundary.overlap(mouseBoundary, artifact.boundary)) {
						activeArtifact = artifact;
						method = artifact.method;
					}
				}
			}).bind(this));
		}
	}).bind(this));

	if (method != null) {
		// update the cursor based on the selected target:
		switch (method) {
			case EditorGameScene.TRANSFORM_STATE.ORIGIN:
			case EditorGameScene.TRANSFORM_STATE.SCALE_TOP_LEFT:
			case EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM_RIGHT:
			case EditorGameScene.TRANSFORM_STATE.SCALE_TOP_RIGHT:
			case EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM_LEFT:
			case EditorGameScene.TRANSFORM_STATE.SCALE_TOP:
			case EditorGameScene.TRANSFORM_STATE.SCALE_RIGHT:
			case EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM:
			case EditorGameScene.TRANSFORM_STATE.SCALE_LEFT:
				this._mouseState.cursor = EditorGameScene.CURSOR_TYPES.POINTER;
				break;

			case EditorGameScene.TRANSFORM_STATE.MOVE:
				this._mouseState.cursor = EditorGameScene.CURSOR_TYPES.MOVE;
				break;

			default:
				this._mouseState.cursor = EditorGameScene.CURSOR_TYPES.DEFAULT;
		}

		this._updateCursorGraphic();

	} else {
		this._mouseState.cursor = EditorGameScene.CURSOR_TYPES.DEFAULT;
		this._updateCursorGraphic();
	}

	return method;
};

EditorGameScene.prototype._onSubjectMethodOver = function () {
	var commands = [];
	this._selectedObjects.forEach((function (subject) {
		switch (this._subjectsMethod) {
			case EditorGameScene.TRANSFORM_STATE.SCALE_TOP_LEFT:
			case EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM_RIGHT:
			case EditorGameScene.TRANSFORM_STATE.SCALE_TOP_RIGHT:
			case EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM_LEFT:
			case EditorGameScene.TRANSFORM_STATE.SCALE_TOP:
			case EditorGameScene.TRANSFORM_STATE.SCALE_RIGHT:
			case EditorGameScene.TRANSFORM_STATE.SCALE_BOTTOM:
			case EditorGameScene.TRANSFORM_STATE.SCALE_LEFT:
				commands = commands.concat([
					new EditPropertyCommand(subject.gameObject.transform, "_scale", subject.originalTransform.getScale(), subject.gameObject.transform.getScale()),
					new EditPropertyCommand(subject.gameObject.transform, "_position", subject.originalTransform.getPosition(), subject.gameObject.transform.getPosition())
				]);

				break;

			case EditorGameScene.TRANSFORM_STATE.MOVE:
				commands.push(
					new EditPropertyCommand(subject.gameObject.transform, "_position", subject.originalTransform.getPosition(), subject.gameObject.transform.getPosition())
				);

				break;
		}
	}).bind(this));

	// store all commands at the same time so they are considered as a single action
	AngularHelper.commandHistory.store(commands);
};

EditorGameScene.prototype._updateCursorGraphic = function () {
	document.body.style.cursor = this._mouseState.cursor;
};

EditorGameScene.prototype._isScaleEnabled = function () {
	return EditorGameScene.activeTransformTool == EditorGameScene.TRANSFORM_TOOL_OPTIONS.SELECT ||
		EditorGameScene.activeTransformTool == EditorGameScene.TRANSFORM_TOOL_OPTIONS.SCALE;
};

EditorGameScene.prototype._isMoveEnabled = function () {
	return EditorGameScene.activeTransformTool == EditorGameScene.TRANSFORM_TOOL_OPTIONS.SELECT ||
		EditorGameScene.activeTransformTool == EditorGameScene.TRANSFORM_TOOL_OPTIONS.MOVE;
};

EditorGameScene.prototype._isRotateEnabled = function () {
	return EditorGameScene.activeTransformTool == EditorGameScene.TRANSFORM_TOOL_OPTIONS.SELECT ||
		EditorGameScene.activeTransformTool == EditorGameScene.TRANSFORM_TOOL_OPTIONS.ROTATE;
};

EditorGameScene.prototype._renderSelectedObjectsArtifacts = function (delta) {
	if (this._selectedObjects.length == 0) {
		return;
	}

	var rectangleBulk = EditorGameScene.DIMENSIONS.ARTIFACT_RECTANGLE_BULK * this._camera.zoom;
	var rectangleHalfBulk = rectangleBulk / 2;
	var minorRectangleBulk = rectangleBulk / 1.28;
	var minorRectangleHalfBulk = minorRectangleBulk / 2;
	var originBulk = 6 * this._camera.zoom;

	var boundaryColor = Color.Orange;
	var scaleColor = Color.SunFlower;

	// TODO: Handle small objects. Depending on the selected game object size, show different artifacts.

	this._selectedObjects.forEach((function (selected) {
		var elem = selected.gameObject;

		if (!elem.enabled) {
			return;
		}

		var vertices = elem.getBoundary();
		var position = elem.transform.getPosition();
		var rotation = elem.transform.getRotation();

		//this._primitiveRender.drawLine(position, selected.originalTransform.getPosition(), 1, Color.Orange);

		if (isSprite(elem) && elem.getTexture() && elem.getTexture().isReady()) {
			// draw main lines:
			this._primitiveRender.drawLine(vertices.topLeft, vertices.topRight, 1, boundaryColor);
			this._primitiveRender.drawLine(vertices.topRight, vertices.bottomRight, 1, boundaryColor);
			this._primitiveRender.drawLine(vertices.bottomRight, vertices.bottomLeft, 1, boundaryColor);
			this._primitiveRender.drawLine(vertices.bottomLeft, vertices.topLeft, 1, boundaryColor);

			// draw vertex rectangles (scale)
			if (this._isScaleEnabled()) {
				// corners
				this._primitiveRender.drawRectangle(new Rectangle(vertices.topLeft.x - rectangleHalfBulk, vertices.topLeft.y - rectangleHalfBulk, rectangleBulk, rectangleBulk), scaleColor, rotation);
				this._primitiveRender.drawRectangle(new Rectangle(vertices.topRight.x - rectangleHalfBulk, vertices.topRight.y - rectangleHalfBulk, rectangleBulk, rectangleBulk), scaleColor, rotation);
				this._primitiveRender.drawRectangle(new Rectangle(vertices.bottomRight.x - rectangleHalfBulk, vertices.bottomRight.y - rectangleHalfBulk, rectangleBulk, rectangleBulk), scaleColor, rotation);
				this._primitiveRender.drawRectangle(new Rectangle(vertices.bottomLeft.x - rectangleHalfBulk, vertices.bottomLeft.y - rectangleHalfBulk, rectangleBulk, rectangleBulk), scaleColor, rotation);

				// sides
				// note: we need to calculate the mid point for each two vertex combination (see more at: http://www.purplemath.com/modules/midpoint.htm)
				var topMiddlePosition = new Vector2((vertices.topLeft.x + vertices.topRight.x) / 2.0, (vertices.topLeft.y + vertices.topRight.y) / 2.0);
				var leftMiddlePosition = new Vector2((vertices.topLeft.x + vertices.bottomLeft.x) / 2.0, (vertices.topLeft.y + vertices.bottomLeft.y) / 2.0);
				var bottomMiddlePosition = new Vector2((vertices.bottomLeft.x + vertices.bottomRight.x) / 2.0, (vertices.bottomLeft.y + vertices.bottomRight.y) / 2.0);
				var rightMiddlePosition = new Vector2((vertices.bottomRight.x + vertices.topRight.x) / 2.0, (vertices.bottomRight.y + vertices.topRight.y) / 2.0);

				this._primitiveRender.drawRectangle(new Rectangle(topMiddlePosition.x - minorRectangleHalfBulk, topMiddlePosition.y - minorRectangleHalfBulk, rectangleBulk, minorRectangleBulk), scaleColor, rotation);
				this._primitiveRender.drawRectangle(new Rectangle(leftMiddlePosition.x - minorRectangleHalfBulk, leftMiddlePosition.y - minorRectangleHalfBulk, rectangleBulk, minorRectangleBulk), scaleColor, rotation);
				this._primitiveRender.drawRectangle(new Rectangle(bottomMiddlePosition.x - minorRectangleHalfBulk, bottomMiddlePosition.y - minorRectangleHalfBulk, rectangleBulk, minorRectangleBulk), scaleColor, rotation);
				this._primitiveRender.drawRectangle(new Rectangle(rightMiddlePosition.x - minorRectangleHalfBulk, rightMiddlePosition.y - minorRectangleHalfBulk, rectangleBulk, minorRectangleBulk), scaleColor, rotation);

			}

			// draw transform artifacts (move)
			// y
			//this._primitiveRender.drawRectangle(new Rectangle(topMiddlePosition.x - translateLineHalfBulk, topMiddlePosition.y - translateLineLength, translateLineBulk, translateLineLength), Color.Nephritis);
			//this._primitiveRender.drawRectangle(new Rectangle(position.x - translateLineHalfBulk, position.y - translateLineLength, translateLineBulk, translateLineLength), Color.Nephritis);
			//this._primitiveRender.drawTriangle(new Vector2(position.x - translateHandlerHalfBulk, position.y - translateLineLength), new Vector2(position.x + translateHandlerHalfBulk, position.y - translateLineLength), new Vector2(position.x, position.y - translateLineLength - translateHandlerBulk), Color.Nephritis);
			// x
			//this._primitiveRender.drawRectangle(new Rectangle(position.x, position.y - translateLineHalfBulk, translateLineLength, translateLineBulk), Color.Scarlet);
			//this._primitiveRender.drawTriangle(new Vector2(position.x + translateLineLength, position.y - translateHandlerHalfBulk), new Vector2(position.x + translateLineLength, position.y + translateHandlerHalfBulk), new Vector2(position.x + translateLineLength + translateHandlerBulk, position.y), Color.Scarlet);

			// draw origin artifact:
			this._primitiveRender.drawCircle(position, originBulk, 16, Color.SunFlower);

			//this._primitiveRender.drawLine(position, vertices.topLeft, 1, Color.Red);

		}
	}).bind(this));
};

EditorGameScene.prototype._handleMouseUpdate = function (delta) {

};

EditorGameScene.prototype._refreshSelectedObjectsData = function () {
	this._selectedObjects.forEach(function (elem) {
		elem.originalTransform = elem.gameObject.transform.clone()
	});
};


/**
 *
 * @private
 */
EditorGameScene.prototype._handleSelection = function (intersection, topLevelOnly, disableSelectionHistory) {
	var selectionRectangle = Rectangle.fromVectors(this._mouseState.startPosition, this._mouseState.lastPosition);
	var gameObjects = this.getAllGameObjects();
	var selected = [];

	// let's check on all the game scene game objects if there is a selection collision detected:
	gameObjects.forEach((function (obj) {
		// is the object enabled ?
		if (obj.enabled) {
			var add = intersection ? obj.collidesWithPoint(this._mouseState.startPosition) : selectionRectangle.contains(obj.getRectangleBoundary());

			// collision was detected?
			if (add) {
				// the object is contained within the selection rectangle, let's add it!
				if (topLevelOnly) {
					// since the collisions are checked sequentially we know for sure that the latest being tested
					// is actually the top level in terms of rendering
					selected.splice(0, 1, obj);

				} else {
					selected.push(obj);

				}
			}
		}
	}).bind(this));

	this.setSelectedObjects(selected, true, disableSelectionHistory);
};

/**
 * Store the current camera position as the starting position (this can be used for many editor features)
 * @private
 */
EditorGameScene.prototype._setStartCameraPosition = function () {
	this._startCameraPosition = new Vector2(this._camera.x, this._camera.y);
};

/**
 * Render for all mouse related visible actions
 * @param delta
 * @private
 */
EditorGameScene.prototype._renderMouse = function (delta) {
	// is the mouse being dragged?
	if (this._mouseState.dragging && this._mouseState.startPosition != this._mouseState.lastPosition) {
		// cool, is this a selection (left button)?
		if (this._mouseState.button === 0 && this._subjectsMethod == null) {
			var rectangle = Rectangle.fromVectors(this._mouseState.startPosition, this._mouseState.lastPosition);
			this._primitiveRender.drawRectangle(rectangle, this._colors.selection);
		}

		//this._primitiveRender.drawCircle(this._mouseState.startPosition, 8, 4, Color.Green);
		//this._primitiveRender.drawLine(this._mouseState.startPosition, this._mouseState.lastPosition, 1, Color.Green);
	}
};

/**
 * Restores the EditorGameScene from a data object
 * @param data
 * @returns {EditorGameScene}
 */
EditorGameScene.restore = function (data) {
	return new EditorGameScene({
		game: GameManager.activeGame,
		backgroundColor: Color.restore(data.backgroundColor),
		camera: Camera2D.restore(data.camera),
		gameObjects: Objectify.restoreArray(data.gameObjects),
	});
};
