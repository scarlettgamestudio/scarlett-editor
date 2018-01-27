/**
 * Created by John
 */

app.factory("sceneSvc", function ($rootScope, constants, gameSvc, scarlettSvc, $q) {
    var svc = {};
    var scope = $rootScope.$new();

    AngularHelper.sceneSvc = svc;

    svc._activeGameScenePath = null;
    svc._activeGameScene = null; // the active game scene, all operations on the scene should be made with this consideration
    svc._selectedObjects = [];

    scope.$on(constants.EVENTS.PROJECT_LOADED, (function (e, project) {
        svc._activeGameScene = null;
        svc._activeGameScenePath = null;

    }).bind(this));

    scope.$on(constants.EVENTS.GAME_INITIALIZE, ((e, project) => {
        if (project.editor && project.editor.lastScene) {
            svc.loadSceneFromFile(scarlettSvc.getActiveProjectPath() + project.editor.lastScene);
        }

    }).bind(this));

    scope.$on(constants.EVENTS.GAME_SCENE_CHANGED, (function (e, scene) {
       svc._selectedObjects = [];

    }).bind(this));

    scope.$on(constants.EVENTS.GAME_OBJECT_REMOVED, (function (e, gameObject) {
        // remove from the selected objects if the case:
        let idx = svc._selectedObjects.indexOfObject(gameObject);
        if (idx >= 0) {
            // remove from the selected objects:
            svc._selectedObjects.splice(idx, 1);

            // broadcast the event so other components know
            EventManager.emit(constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, svc._selectedObjects);
        }

    }).bind(this));

    /**
     * sets the active game scene
     * @param scene
     */
    svc.setActiveGameScene = function (scene) {
        if (!Utils.isGameScene(scene)) {
            return;
        }

        if (svc._activeGameScene && scene.getUID() === svc._activeGameScene.getUID()) {
            // it's the same one, no need for further processing..
            return;
        }

        svc._activeGameScene = scene;

        // update the game active scene:
        scene.getGame().changeScene(scene);

        // update the project editor last scene:
        if (svc._activeGameScenePath) {
            //scarlettSvc.getActiveProject().editor.lastScene = Path.makeRelative(scarlettSvc.activeProjectPath, svc._activeGameScenePath);
        }

        // clear undo/redo history:
        AngularHelper.commandHistory.clear();

        // broadcast this event
        $rootScope.$broadcast(constants.EVENTS.GAME_SCENE_CHANGED, scene);
    };

    /**
     * save the active game scene
     */
    svc.saveActiveScene = function () {
        if (!Utils.isGameScene(svc._activeGameScene)) {
            return;
        }

        // first we get the scene data
        let sceneData = svc._activeGameScene.objectify();

        // the scene already exists on disc?
        if (svc._activeGameScenePath) {
            // write the scene data:
            NativeInterface.writeFile(svc._activeGameScenePath, JSON.stringify(sceneData));

        } else {
            // it doesn't, let's query the user:
            let params = {
                filters: [{name: '', extensions: ['ss']}]
            };

            NativeInterface.saveFileDialog(Path.wrapDirectoryPath(scarlettSvc.activeProjectPath), params, function (path) {
                if (path) {
                    if (Path.relativeTo(path, scarlettSvc.activeProjectPath)) {
                        // also, update the active scene path variable:
                        svc._activeGameScenePath = path;

                        // .. and update the editor values as well:
                        //scarlettSvc.getActiveProject().editor.lastScene = Path.makeRelative(scarlettSvc.activeProjectPath, svc._activeGameScenePath);

                        // write the scene data:
                        NativeInterface.writeFile(path, JSON.stringify(sceneData));
                    }
                }
            });
        }
    };

    /**
     * loads a scene from a given path
     * @param path
     */
    svc.loadSceneFromFile = function (path) {
        let defer = $q.defer();

        NativeInterface.readFile(path, function (result) {
            if (result === false) {
                // the file failed to load..
                defer.reject(error);
            } else {
                try {
                    EditorGameScene.restore(JSON.parse(result)).then((gameScene) => {
                        svc._activeGameScenePath = path;
                        svc.setActiveGameScene(gameScene);
                        defer.resolve(gameScene);
                    });
                } catch (error) {
                    // the project failed while parsing..
                    defer.reject(error);
                }
            }
        });

        return defer.promise;
    };

    /**
     * gets the active game scene
     * @returns {*|null}
     */
    svc.getActiveGameScene = function () {
        return this._activeGameScene;
    };

    /**
     * Add the given object to a given parent or scene root
     * @param gameObject
     * @param parent
     * @param index
     */
    svc.addGameObject = function(gameObject, parent, index) {
        if (isObjectAssigned(parent)) {
            parent.addChild(gameObject, index);

        } else {
            // since there is no parent, we add it directly to the scene container:
            svc._activeGameScene.addGameObject(gameObject, index);
        }

        $rootScope.$broadcast(constants.EVENTS.GAME_OBJECT_ADDED, gameObject, parent);
    };

    /**
     * Add the given object to the selected scene
     * @param gameObject
     * @param index
     */
    svc.addGameObjectToScene = function (gameObject, index) {
        if (svc._activeGameScene === null) {
            // cannot add without a active scene..
            return;
        }

        let parent = null;

        // is there any object selected? if so, we will add it as a child (if it's only one)
        if (svc._selectedObjects.length === 1) {
            parent = svc._selectedObjects[0];
            parent.addChild(gameObject, index);

        } else {
            // since there is no parent, we add it directly to the scene container:
            svc._activeGameScene.addGameObject(gameObject, index);
        }

        // finally, broadcast this so other components know the game object was added to the scene:
        $rootScope.$broadcast(constants.EVENTS.GAME_OBJECT_ADDED, gameObject, parent);
    };

    /**
     * executes the remove game object command for the selected game objects
     */
    svc.executeRemoveSelectedGameObjects = function() {
        AngularHelper.commandHistory.execute(
            new GameObjectRemoveCommand(svc._selectedObjects.slice()));
    };

    /**
     * removes all selected game objects from scene
     */
    svc.removeSelectedGameObjects = function() {
        svc.removeGameObjectsFromScene(svc._selectedObjects);
        svc.clearSelectedObjects();
    };

    /**
     * removes all the given game objects from the scene
     * @param gameObjects
     */
    svc.removeGameObjectsFromScene = function (gameObjects) {
        function recursive(array, toDelete) {
            for (let i = array.length - 1; i >= 0; i--) {
                let idx = toDelete.indexOfObject(array[i]);

                if (idx >= 0) {
                    // announce the removal:
                    $rootScope.$broadcast(constants.EVENTS.GAME_OBJECT_REMOVED, array[i]);

                    // remove the game object from the current array:
                    array.splice(i, 1);

                    // remove from the selection:
                    toDelete.splice(idx, 1);

                    // any more to look for?
                    if (toDelete.length === 0) {
                        return true;
                    }

                } else {
                    // let's check on the child nodes though:
                    let end = recursive(array[i].getChildren(), toDelete);

                    if (end) {
                        return end;
                    }
                }
            }
        }

        recursive(svc._activeGameScene.getGameObjects(), gameObjects.slice());
    };

    /**
     * gets the selected game objects
     */
    svc.getSelectedObjects = function () {
        return svc._selectedObjects;
    };

    /**
     * gets an array of the selected game objects uid values
     */
    svc.getSelectedObjectsUIDs = function () {
        if (!svc._selectedObjects || svc._selectedObjects.length === 0) {
            return [];
        }

        let arr = [];
        svc._selectedObjects.forEach(function (obj) {
            arr.push(obj.getUID());
        });

        return arr;
    };

    /**
     * set the selected game objects
     * @param objects
     */
    svc.setSelectedObjects = function (objects, disableBroadcast, disableCommandStore) {
        // store the command ?
        if (!disableCommandStore) {
            AngularHelper.commandHistory.execute(
                new GameObjectSelectionCommand(svc._selectedObjects.slice(), objects.slice()));

        } else {
            // update the selected objects object:
            svc._selectedObjects = objects;
        }

        // broadcast the event so other components know
        if (!disableBroadcast) {
            EventManager.emit(constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, objects);
        }
    };

    /**
     * checks if a given object is already selected
     * @param object
     */
    svc.isObjectSelected = function (object) {
        return svc._selectedObjects.indexOf(object) >= 0;
    };

    /**
     * clear the selected objects array
     */
    svc.clearSelectedObjects = function () {
        svc._selectedObjects = [];
        EventManager.emit(constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, []);
    };

    return svc;
});
