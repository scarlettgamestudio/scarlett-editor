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
    this._mouseState = {
        startPosition: null,
        lastPosition: null,
        startScreenPosition: null,
        button: null,
        dragging: false
    };
}

inheritsFrom(EditorGameScene, GameScene);

/** public functions **/

/**
 * Mouse wheel event
 * @param evt
 */
EditorGameScene.prototype.onMouseWheel = function(evt) {
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
    this._mouseState.startPosition = this._getWorldCoordinates(evt.offsetX, evt.offsetY);
    this._mouseState.lastPosition = this._mouseState.startPosition;
    this._mouseState.button = evt.button;
    this._mouseState.dragging = true;
    this._mouseState.startScreenPosition = new Vector2(evt.offsetX, evt.offsetY);
    //console.log(this._mouseState.startPosition.x + ":" + this._mouseState.startPosition.y);

    switch(evt.button) {
        case 1:
            document.body.style.cursor = '-webkit-grab';
            break;
    }

    // store the current camera position
    this._setStartCameraPosition();
};

/**
 * Mouse Move Event
 * @param evt
 */
EditorGameScene.prototype.onMouseMove = function (evt) {
    if (this._mouseState.dragging) {
        this._mouseState.lastPosition = this._getWorldCoordinates(evt.offsetX, evt.offsetY);

        if (this._mouseState.button == 1) {
            this._camera.x = this._startCameraPosition.x + ((this._mouseState.startScreenPosition.x - evt.offsetX) * this._camera.zoom);
            this._camera.y = this._startCameraPosition.y + ((this._mouseState.startScreenPosition.y - evt.offsetY) * this._camera.zoom);
        }
    }
};

/**
 * Mouse Out Event
 * @param evt
 */
EditorGameScene.prototype.onMouseOut = function (evt) {
    // if it's not selecting (left button), clear the dragging state:
    if(this._mouseState.button !== 0) {
        this._mouseState.dragging = false;
    }

    document.body.style.cursor = "default";
};

/**
 * Mouse Up Event
 * @param evt
 */
EditorGameScene.prototype.onMouseUp = function (evt) {
    this._mouseState.dragging = false;

    document.body.style.cursor = "default";
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
};

/** private functions **/

EditorGameScene.prototype._handleMouseUpdate = function(delta) {
    // should we drag the scene? (middle button)

};

/**
 * Store the current camera position as the starting position (this can be used for many editor features)
 * @private
 */
EditorGameScene.prototype._setStartCameraPosition = function() {
    this._startCameraPosition = new Vector2(this._camera.x, this._camera.y);
};

/**
 * Render for all mouse related visible actions
 * @param delta
 * @private
 */
EditorGameScene.prototype._renderMouse = function (delta) {
    // is the mouse being dragged?
    if (this._mouseState.dragging) {
        // cool, is this a selection (left button)?
        if (this._mouseState.button === 0) {
            var rectangle = this._rectangleFromVectors(this._mouseState.startPosition, this._mouseState.lastPosition);
            this._primitiveRender.drawRectangle(rectangle, this._colors.selection);
        }
    }
};

/**
 * Creates a rectangle based on two vectors
 * @param va
 * @param vb
 * @private
 */
EditorGameScene.prototype._rectangleFromVectors = function (va, vb) {
    var x, y, width, height;

    if (va.x > vb.x) {
        x = vb.x;
        width = Math.abs(va.x - vb.x);
    } else {
        x = va.x;
        width = Math.abs(vb.x - va.x);
    }

    if(va.y > vb.y) {
        y = vb.y;
        height = Math.abs(va.y - vb.y);
    } else {
        y = va.y;
        height = Math.abs(vb.y - va.y);
    }

    return new Rectangle(x, y, width, height);
};

/**
 * Calculates the world coordinates based on the screen position:
 * @param screenX
 * @param screenY
 * @private
 */
EditorGameScene.prototype._getWorldCoordinates = function (screenX, screenY) {
    var screenDim = this._game.getVirtualResolution();

    // first we normalize the screen position:
    var x = (2.0 * screenX) / screenDim.width - 1.0;
    var y = 1.0 - (2.0 * screenY) / screenDim.height;

    // then we calculate and return the world coordinates:
    mat4.invert(this._mat, this._camera.getMatrix());

    return Vector2.transformMat4(new Vector2(x, y), this._mat);
};

