/**
 * EditorGameScene
 */
function EditorGameScene(params) {
    GameScene.call(this, params);

    // public properties:

    // private properties:
    this._primitiveRender = new PrimitiveRender(this._game);
    this._colors = {
        selection: Color.fromRGBA(100.0, 149.0, 237.0, 0.275)
    };
    this._mat = mat4.create(); // temporary matrix that can be used in multiple situations
    this._startCameraPosition = null;
    this._selectedObjects = [];
    this._subjectsMethod = null;
    this._mouseState = {
        startPosition: null,
        lastPosition: null,
        startScreenPosition: null,
        button: null,
        dragging: false,
        cursor: "default"
    };
}

EditorGameScene.TRANSFORM_STATE = {
    MOVE: 1,
    MOVE_X: 2,
    MOVE_Y: 3,
    SCALE: 4,
    SCALE_X: 5,
    SCALE_Y: 6,
    ROTATE: 7
};

EditorGameScene.CURSOR_TYPES = {
    GRAB: "-webkit-grab",
    DEFAULT: "default",
    MOVE: "move"
};

inheritsFrom(EditorGameScene, GameScene);

/** public functions **/

/**
 * Mouse wheel event
 * @param evt
 */
EditorGameScene.prototype.onMouseWheel = function (evt) {
    var wheelY = evt.deltaY;
    this._camera.zoom += wheelY / 1000.0;
    this._camera.zoom = MathHelper.clamp(this._camera.zoom, 0.01, 1000);
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
    if (this._mouseState.dragging) {
        this._mouseState.lastPosition = this._camera.screenToWorldCoordinates(evt.offsetX, evt.offsetY);

        // middle button?
        if (this._mouseState.button == 1) {
            this._camera.x = this._startCameraPosition.x + ((this._mouseState.startScreenPosition.x - evt.offsetX) * this._camera.zoom);
            this._camera.y = this._startCameraPosition.y + ((this._mouseState.startScreenPosition.y - evt.offsetY) * this._camera.zoom);
        }

        // left button?
        if (this._mouseState.button == 0) {
            if (this._subjectsMethod == null) {
                // handle selection
                this._handleSelection(false);

            } else {
                // update any necessary selected subjects:
                this._updateSubjects(evt);

            }
        }
    }

    // test for editor artifact collisions?
    if (this._selectedObjects.length > 0 && this._subjectsMethod == null) {
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
    if (this._mouseState.button == 0 && this._mouseState.lastPosition == this._mouseState.startPosition) {
        this._handleSelection(true);
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

EditorGameScene.prototype.setSelectedObjects = function (gameObjects) {
    var selected = [];
    gameObjects.forEach(function (elem) {
        selected.push({
            gameObject: elem,
            originalTransform: elem.transform.clone()
        })
    });

    this._selectedObjects = selected;
};

/** private functions **/

EditorGameScene.prototype._updateSubjects = function (evt) {
    this._selectedObjects.forEach((function (subject) {
        switch (this._subjectsMethod) {
            case EditorGameScene.TRANSFORM_STATE.MOVE:
                subject.gameObject.transform.setPosition(
                    Math.round(subject.originalTransform.getPosition().x - ((this._mouseState.startScreenPosition.x - evt.offsetX) * this._camera.zoom)),
                    Math.round(subject.originalTransform.getPosition().y - ((this._mouseState.startScreenPosition.y - evt.offsetY) * this._camera.zoom)));
                AngularHelper.refresh();
                break;
                break;
        }
    }).bind(this));
};

EditorGameScene.prototype._clearSubjectsMethod = function () {
    this._subjectsMethod = null;
};

/**
 * Handles the cursor interaction with the selected game objects transform artifacts
 * @param evt
 * @private
 */
EditorGameScene.prototype._handleMouseArtifactCollision = function (evt) {
    var worldPosition = this._camera.screenToWorldCoordinates(evt.offsetX, evt.offsetY);
    var method = null;

    // let's check on all the game scene game objects if there is a selection collision detected:
    this._selectedObjects.forEach(function (selected) {
        if (selected.gameObject.collidesWith(worldPosition)) {

            // TODO: prioritize the method based on the selection target
            method = EditorGameScene.TRANSFORM_STATE.MOVE;

        }
    });

    if (method != null) {
        // update the cursor based on the selected target:
        switch (method) {
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

EditorGameScene.prototype._updateCursorGraphic = function () {
    document.body.style.cursor = this._mouseState.cursor;
};

EditorGameScene.prototype._renderSelectedObjectsArtifacts = function (delta) {
    if (this._selectedObjects.length == 0) {
        return;
    }

    var rectangleBulk = 8 * this._camera.zoom;
    var rectangleHalfBulk = rectangleBulk / 2;
    var minorRectangleBulk = rectangleBulk / 1.28;
    var minorRectangleHalfBulk = minorRectangleBulk / 2;
    var translateLineLength = 52 * this._camera.zoom;
    var translateHandlerBulk = 16 * this._camera.zoom;
    var translateHandlerHalfBulk = translateHandlerBulk / 2;
    var translateLineBulk = 2 * this._camera.zoom;
    var translateLineHalfBulk = translateLineBulk / 2;
    var borderThickness = 2 * this._camera.zoom;
    var borderHalfThickness = borderThickness / 2;
    var originBulk = 6 * this._camera.zoom;

    var boundaryColor = Color.Orange;
    var scaleColor = Color.SunFlower;

    // TODO: Handle small objects. Depending on the selected game object size, show different artifacts.

    this._selectedObjects.forEach((function (selected) {
        var elem = selected.gameObject;
        var vertices = elem.getBoundary();
        var position = elem.transform.getPosition();
        var rotation = elem.transform.getRotation();

        if (isSprite(elem) && elem.getTexture() && elem.getTexture().isReady()) {
            // draw main lines:
            this._primitiveRender.drawLine(vertices.topLeft, vertices.topRight, 1, boundaryColor);
            this._primitiveRender.drawLine(vertices.topRight, vertices.bottomRight, 1, boundaryColor);
            this._primitiveRender.drawLine(vertices.bottomRight, vertices.bottomLeft, 1, boundaryColor);
            this._primitiveRender.drawLine(vertices.bottomLeft, vertices.topLeft, 1, boundaryColor);

            // draw vertex rectangles (scale)
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

            // draw transform artifacts (move)
            // y
            //this._primitiveRender.drawRectangle(new Rectangle(topMiddlePosition.x - translateLineHalfBulk, topMiddlePosition.y - translateLineLength, translateLineBulk, translateLineLength), Color.Nephritis);
            //this._primitiveRender.drawRectangle(new Rectangle(position.x - translateLineHalfBulk, position.y - translateLineLength, translateLineBulk, translateLineLength), Color.Nephritis);
            //this._primitiveRender.drawTriangle(new Vector2(position.x - translateHandlerHalfBulk, position.y - translateLineLength), new Vector2(position.x + translateHandlerHalfBulk, position.y - translateLineLength), new Vector2(position.x, position.y - translateLineLength - translateHandlerBulk), Color.Nephritis);
            // x
            //this._primitiveRender.drawRectangle(new Rectangle(position.x, position.y - translateLineHalfBulk, translateLineLength, translateLineBulk), Color.Scarlet);
            //this._primitiveRender.drawTriangle(new Vector2(position.x + translateLineLength, position.y - translateHandlerHalfBulk), new Vector2(position.x + translateLineLength, position.y + translateHandlerHalfBulk), new Vector2(position.x + translateLineLength + translateHandlerBulk, position.y), Color.Scarlet);

            // draw origin rectangle:
            this._primitiveRender.drawCircle(position, 6, 16, Color.SunFlower);

            //this._primitiveRender.drawRectangle(new Rectangle(position.x - rectangleHalfBulk - borderHalfThickness, position.y - rectangleHalfBulk - borderHalfThickness, rectangleBulk + borderThickness, rectangleBulk + borderThickness), Color.Gray, rotation);
            //this._primitiveRender.drawRectangle(new Rectangle(position.x - rectangleHalfBulk, position.y - rectangleHalfBulk, rectangleBulk, rectangleBulk), Color.White, rotation);

            //this._primitiveRender.drawTriangle(new Vector2(position.x - originBulk, position.y - originBulk), new Vector2(position.x - originBulk, position.y + originBulk), new Vector2(position.x + originBulk, position.y - originBulk), Color.Nephritis);
            //this._primitiveRender.drawTriangle(new Vector2(position.x - originBulk, position.y + originBulk), new Vector2(position.x + originBulk, position.y + originBulk), new Vector2(position.x + originBulk, position.y - originBulk), Color.Scarlet);
        }
    }).bind(this));
};

EditorGameScene.prototype._handleMouseUpdate = function (delta) {

};

EditorGameScene.prototype._refreshSelectedObjectsData = function() {
    this._selectedObjects.forEach(function (elem) {
        elem.originalTransform = elem.gameObject.transform.clone()
    });
};


/**
 *
 * @private
 */
EditorGameScene.prototype._handleSelection = function (intersection) {
    var selectionRectangle = Rectangle.fromVectors(this._mouseState.startPosition, this._mouseState.lastPosition);
    var gameObjects = this.getAllGameObjects();
    var selected = [];

    // let's check on all the game scene game objects if there is a selection collision detected:
    gameObjects.forEach((function (obj) {
        var add = intersection ? obj.collidesWith(this._mouseState.startPosition) : selectionRectangle.contains(obj.getRectangleBoundary());
        if (add) {
            // the object is contained within the selection rectangle, let's add it!
            selected.push(obj);
        }
    }).bind(this));

    this.setSelectedObjects(selected);
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
