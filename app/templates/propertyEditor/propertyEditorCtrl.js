app.controller('PropertyEditorCtrl', ['$scope', 'logSvc', 'constants',
    function ($scope, logSvc, constants) {

        const _LOG_CONTEXT = "propertyEditor ";
        const _PATH_SEPARATOR = "/";
        const _AVAILABLE_EDITORS = ["boolean", "color", "filepath", "image", "number", "string", "vector2"];

        function resetModel() {
            $scope.model = {
                propertyContainers: [],         // the property containers that will be displayed on the UI
                targets: [],                    // the given objects
                multipleTargets: false,         // flag value for easier access
                hiddenContainers: false         // when true, means some containers are missing (multi-selection)
            };
        }

        /**
         * Finds and returns an array of properties that contain the rule ownContainer set to true
         * @param object
         * @returns {Array}
         */
        function getObjectOwnContainerProperties(object) {
            let properties = [];

            if (isObjectAssigned(object)) {
                let targetType = getType(object);
                let propertyNames = Object.getOwnPropertyNames(object);
                propertyNames.forEach(function (entry) {
                    if (entry.length > 0 && isObjectAssigned(object[entry])) {
                        let customRule = AttributeDictionary.getRule(targetType, entry) || {};

                        // is this property supposed to be visible?
                        if (customRule.hasOwnProperty("visible") && customRule.visible === false) {
                            // no ? ok.. leave!
                            return;
                        }

                        // show this property in its own container?
                        if (customRule.hasOwnProperty("ownContainer") && customRule.ownContainer === true) {
                            // yes, add it
                            properties.push(entry);
                        }
                    }
                });
            }

            return properties;
        }

        /**
         *
         * @param object
         * @returns {Array}
         */
        function getObjectProperties(object, parent, path) {
            let properties = [];

            if (!isObjectAssigned(object)) {
                return properties;
            }

            let targetType = getType(object);
            let propertyNames = Object.getOwnPropertyNames(object);
            propertyNames.forEach(function (entry) {
                if (entry.length > 0) {
                    let customRule = AttributeDictionary.getRule(targetType, entry) || {};

                    if (!isObjectAssigned(object[entry])) {
                        return;
                    }

                    // is this property supposed to be visible?
                    if ((customRule.hasOwnProperty("visible") && customRule.visible === false) ||
                        (customRule.hasOwnProperty("ownContainer") && customRule.ownContainer === true)) {
                        // no ? ok.. leave!
                        return;
                    }

                    let capitalName = capitalize(entry);
                    let customEditor = customRule["editor"];
                    let valid = true;
                    let type = getType(object[entry]);
                    let propertyModel = null;
                    let myPath = path + _PATH_SEPARATOR + entry;

                    let availability = null;
                    if (customRule.hasOwnProperty("available") && isFunction(customRule.available)) {
                        availability = customRule.available;
                    }

                    if (_AVAILABLE_EDITORS.indexOf(type.toLowerCase()) >= 0) {
                        propertyModel = {
                            name: entry,
                            path: myPath,
                            extended: false,
                            displayName: customRule.displayName || splitCamelCase(capitalName),
                            readOnly: customRule.readOnly || false,
                            type: type,
                            systemType: typeof object[entry],
                            bindOnce: false,
                            parent: parent,
                            editor: customEditor,
                            setter: customRule.setter,
                            getter: customRule.getter,
                            available: availability,
                            hasDifferentAssignments: false,  // when true, it means the other selected targets have different values assigned
                            differentProperties: [] 		 // this array contains the property sub-property differences (for multi-selection)
                        };

                        if (customRule.hasOwnProperty("bindOnce")) {
                            propertyModel.bindOnce = customRule.bindOnce;
                        }

                        // private property?
                        if (valid && entry.substring(0, 1) === "_") {
                            if (entry.length < 2) {
                                valid = false;

                            } else if (!propertyModel.setter || !propertyModel.getter) {
                                // the setter/getter are not specified and this is a private variable
                                // so we either find them manually or invalidate the property:
                                capitalName = capitalize(entry.slice(1));

                                // does it have getter/setter?
                                if (!object["set" + capitalName] || !object['get' + capitalName]) {
                                    valid = false;

                                } else {
                                    if (typeof customRule.displayName === "undefined") {
                                        propertyModel.displayName = splitCamelCase(capitalName);
                                    }

                                    // for the getter we want to bind the object so we keep targeting the same instance
                                    propertyModel.getter = object['get' + capitalName].bind(object);

                                    // important: in the setter, we will later only apply the function based on the
                                    // selection (custom context), so we don't really want/can't bind it here!
                                    propertyModel.setter = object['set' + capitalName];
                                }
                            }
                        }

                    } else if(entry.substring(0, 1) !== "_") {
                        // if the property
                        propertyModel = {
                            name: entry,
                            extended: true,
                            path: myPath,
                            parent: parent,
                            displayName: customRule.displayName || splitCamelCase(capitalName),
                            type: type,
                            systemType: typeof object[entry],
                            target: object[entry],
                            open: true,
                        };

                        propertyModel.properties = getObjectProperties(object[entry], propertyModel, myPath)
                    }

                    if (propertyModel !== null && valid) {
                        properties.push(propertyModel);
                    }
                }
            });

            return properties;
        }

        function createPropertyContainerFromObject(object) {
            let type = getType(object);
            return {
                target: object,
                displayName: splitCamelCase(capitalize(type)),
                type: type,
                open: true,
                properties: getObjectProperties(object, null, "")
            }
        }

        function getPropertyContainers(object) {
            let propertyContainers = [];
            propertyContainers.push(createPropertyContainerFromObject(object));

            let ownContainerProperties = getObjectOwnContainerProperties(object);
            ownContainerProperties.forEach(function (property) {
                propertyContainers.push(createPropertyContainerFromObject(object[property]));
            });

            return propertyContainers;
        }

        function addTarget(target) {
            let targetModel = {
                object: target,
                propertyContainers: getPropertyContainers(target)
            };

            $scope.model.targets.push(targetModel);
        }

        function containerTypeExists(containerType, containerHolder) {
            containerHolder.forEach(function (container) {
                if (container.type === containerType) {
                    return true;
                }
            });

            return false;
        }

        function getCommonContainers(targets) {
            // we need to lookup the containers that exist in all targets.
            // since they need to exist in all, there's no need to pick more than one target containers for comparison.
            let commonContainers = [];
            let baseContainers = targets[0].propertyContainers;
            let valid;

            for (let i = 0; i < baseContainers.length; i++) {
                valid = true;

                for (let j = 1; j < $scope.model.targets; j++) {
                    if (!containerTypeExists(baseContainers[i].type, targets[j])) {
                        valid = false;
                        $scope.model.hiddenContainers = true;
                        break;
                    }
                }

                if (valid) {
                    commonContainers.push(baseContainers[i]);
                }
            }

            return commonContainers;
        }

        function getContainerByType(containerHolder, type) {
            for (let i = 0; i < containerHolder.length; i++) {
                if (containerHolder[i].type === type) {
                    return containerHolder[i];
                }
            }

            return null;
        }

        function getDifferentObjectProperties(objectA, objectB, property) {
            let differences = [];

            // this can only work if both objects are of the same kind and are both complex objects
            if (typeof objectA[property] !== "object" || (getType(objectA[property]) !== getType(objectB[property]))) {
                return differences;
            }

            // again, since these are both the same object type, they should have the same property names
            let propertyNames = Object.getOwnPropertyNames(objectA[property]);
            propertyNames.forEach(function (propertyName) {
                // TODO: validate if there is a getter for each [private] property (if necessary)
                if (propertyName.length > 0 && propertyName.substring(0, 1) !== "_") {
                    if (!isEqual(objectA[property][propertyName], objectB[property][propertyName])) {
                        differences.push(propertyName);
                    }
                }
            });

            return differences;
        }

        function getUnifiedPropertyContainers(targets) {
            // first get the common containers:
            let unifiedContainers = getCommonContainers(targets);

            // now we need to look through every common container and specify which values aren't equal in all and
            // flag them so the user can know (UI must take benefit from this)
            unifiedContainers.forEach(function (aContainer) {
                // now let's get through the other targets containers and compare the property values for each.
                // note that [i] starts at '1' because we know the unifiedContainers was formed from the first target
                for (let i = 1; i < targets.length; i++) {
                    let bContainer = getContainerByType(targets[i].propertyContainers, aContainer.type);
                    // after all those validations it would be a shame if the following condition is false, but better
                    // be safe than sorry:
                    if (bContainer && bContainer.properties.length === aContainer.properties.length) {
                        // now that we have the comparison container, let's go through the properties themselves
                        for (let j = 0; j < bContainer.properties.length; j++) {

                            if (aContainer.properties[j].extended) {
                                let recursiveProbe = (ao, bo) => {
                                    for (let h = 0; h < bo.properties.length; h++) {
                                        if (ao.properties[h].extended) {
                                            // call itself:
                                            recursiveProbe(ao.properties[h], bo.properties[h]);

                                        } else {
                                            let va = $scope.getPropertyValue(ao, ao.properties[h]);
                                            let vb = $scope.getPropertyValue(bo, bo.properties[h]);

                                            if (isFunction(va.equals) && isFunction(vb.equals)) {
                                                // both values have the 'equals' function defined, let's use it!
                                                ao.properties[h].hasDifferentAssignments = !va.equals(vb);

                                            } else {
                                                ao.properties[h].hasDifferentAssignments = va !== vb;
                                            }
                                        }

                                        // now let's find the properties that have different values
                                        let propertyDifferences = getDifferentObjectProperties(ao.target, bo.target, ao.properties[h].name);

                                        // since more than two objects can be selected, we can't just push the differences to the property
                                        // 'differentProperties' array, we need to check if it wasn't already added.
                                        propertyDifferences.forEach(function (propertyName) {
                                            if (ao.properties[h].differentProperties.indexOf(propertyName) < 0) {
                                                ao.properties[h].differentProperties.push(propertyName);
                                            }
                                        });
                                    }
                                };

                                recursiveProbe(aContainer.properties[j], bContainer.properties[j]);

                            } else if (!aContainer.properties[j].hasDifferentAssignments) {
                                // a difference for this particular property wasn't yet found.
                                // when true, it means there is no need to validate because one difference is enough
                                let va = $scope.getPropertyValue(aContainer, aContainer.properties[j]);
                                let vb = $scope.getPropertyValue(bContainer, bContainer.properties[j]);

                                if (isFunction(va.equals) && isFunction(vb.equals)) {
                                    // both values have the 'equals' function defined, let's use it!
                                    aContainer.properties[j].hasDifferentAssignments = !va.equals(vb);

                                } else {
                                    aContainer.properties[j].hasDifferentAssignments = va !== vb;
                                }

                                // now let's find the properties that have different values
                                let propertyDifferences = getDifferentObjectProperties(aContainer.target, bContainer.target, aContainer.properties[j].name);

                                // since more than two objects can be selected, we can't just push the differences to the property
                                // 'differentProperties' array, we need to check if it wasn't already added.
                                propertyDifferences.forEach(function (propertyName) {
                                    if (aContainer.properties[j].differentProperties.indexOf(propertyName) < 0) {
                                        aContainer.properties[j].differentProperties.push(propertyName);
                                    }
                                });
                            }
                        }

                    } else {
                        logSvc.warn(_LOG_CONTEXT + "failed to get unified containers, mismatched properties?")
                    }
                }
            });

            return unifiedContainers
        }

        $scope.onGameObjectSelectionChanged = function (selected) {
            $scope.setTargets(selected, true);
        };

        $scope.onAssetSelected = function (selected) {
            $scope.setTargets([selected], true);
        };

        $scope.onObjectsSelected = function (selected) {
            $scope.setTargets(selected, true);
        };

        $scope.onAssetLoaded = function (path) {
            $scope.safeDigest();
        };

        /**
         *
         */
        $scope.$on(constants.EVENTS.GAME_SCENE_CHANGED, (function (e, scene) {
            $scope.setTargets([], true);

        }).bind(this));

        /**
         *
         * @returns {boolean}
         */
        $scope.containsMultipleDefinitions = function () {
            if (!$scope.model.multipleTargets) {
                return false;
            }

            for (let i = 0; i < $scope.model.propertyContainers.length; i++) {
                for (let j = 0; j < $scope.model.propertyContainers[i].properties.length; j++) {
                    if ($scope.model.propertyContainers[i].properties[j].hasDifferentAssignments === true) {
                        return true;
                    }
                }
            }

            return false;
        };

        $scope.getInnerTarget = function(property, target) {
            if (property.parent !== null && property.parent.extended) {
                let pathItems = property.path.split(_PATH_SEPARATOR);

                // we want to remove the first and last element:
                pathItems.shift();
                pathItems.pop();

                pathItems.forEach((path) => {
                    target = target[path];
                });
            }

            return target;
        };

        /**
         * Synchronizes a value to the original object container
         * @param container
         * @param property
         * @param subPropertyName
         * @param value
         */
        $scope.syncValue = function (container, property, subPropertyName, value) {
            if (property.bindOnce || !isObjectAssigned(value) || (subPropertyName && !isObjectAssigned(value[subPropertyName]))) {
                return;
            }

            let commands = [];
            $scope.model.targets.forEach(function (target) {
                let targetContainer = getContainerByType(target.propertyContainers, container.type);
                if (targetContainer) {
                    let target = $scope.getInnerTarget(property, targetContainer.target);

                    if (!subPropertyName) {
                        commands.push(new EditPropertyCommand(target, property.name, target[property.name], value));

                    } else {
                        commands.push(new EditPropertyCommand(target[property.name], subPropertyName, target[property.name][subPropertyName], value));
                    }
                }
            });

            // store all commands at the same time so they are considered as a single action
            AngularHelper.commandHistory.store(commands);

            function syncToContainerAction(targetContainer) {
                let target = $scope.getInnerTarget(property, targetContainer.target);
                let type = property.type.toLowerCase();
                let targetValue = value;

                // is this a multiple target selection and the sub properties aren't all equal?
                if ($scope.model.multipleTargets && subPropertyName && property.differentProperties.length > 0) {
                    // yes, so basically we need to update the subProperty values of each respective target
                    // and then assign the original value with that only modification
                    targetValue = target[property.name];
                    targetValue[subPropertyName] = value[subPropertyName];
                }

                if (property.setter) {
                    let rule = SetterDictionary.getRule(type);
                    // this setter has a definition (rule) applied?
                    if (rule) {
                        // yes, it means the setter will be made using the user defined order
                        let args = [];
                        rule.forEach(function (entry) {
                            if (isObjectAssigned(targetValue[entry])) {
                                args.push(targetValue[entry]);
                            }
                        });

                        //property.setter.apply(targetContainer.target, args);
                        target[property.name].set.apply(target[property.name], args);

                    } else {
                        // this doesn't have any rules so we are supposing it's a single value setter:
                        property.setter.call(target, targetValue);
                    }

                } else {
                    target[property.name] = value;
                }
            }

            if ($scope.model.multipleTargets) {
                // this has a multiple target selection so all targets must be synced:
                $scope.model.targets.forEach(function (target) {
                    let targetContainer = getContainerByType(target.propertyContainers, container.type);
                    if (targetContainer) {
                        syncToContainerAction(targetContainer);
                    }
                });

            } else {
                syncToContainerAction(container);
            }

            // set the following variables to false since we just set the same value for all targets:
            if (subPropertyName) {
                let index = property.differentProperties.indexOf(subPropertyName);
                if (index >= 0) {
                    property.differentProperties.splice(index, 1);
                }
            }

            if (property.differentProperties.length === 0) {
                property.hasDifferentAssignments = false;
            }
        };

        $scope.getPropertyValue = function (container, property) {
            return (property.getter ? property.getter() : container.target[property.name])
        };

        $scope.setTarget = function (target, forceRefresh) {
            $scope.setTargets([target], forceRefresh);
        };

        $scope.setTargets = function (targets, forceRefresh) {
            // set everything fresh
            resetModel();

            targets.forEach(function (target) {
                addTarget(target);
            });

            // there is more than one target?
            if ($scope.model.targets.length > 1) {
                // ok.. unite them so only common property containers are displayed!
                $scope.model.multipleTargets = true;
                $scope.model.propertyContainers = getUnifiedPropertyContainers($scope.model.targets);

            } else if ($scope.model.targets.length === 1) {
                $scope.model.propertyContainers = $scope.model.targets[0].propertyContainers;
            }

            if (forceRefresh) {
                $scope.safeDigest();
            }
        };

        $scope.safeDigest = function () {
            !$scope.$$phase && $scope.$digest();
        };

        $scope.toggleVisibility = function (target) {
            target.open = !target.open;
        };

        $scope.getEditorUrl = function (type) {
            type = type.toLowerCase();

            if (_AVAILABLE_EDITORS.indexOf(type) >= 0) {
                // ok.. the editor should be available :)
                return "templates/propertyEditor/editors/" + type + ".html";
            }
        };

        (function init() {
            resetModel();

            // event subscription:
            EventManager.subscribe(AngularHelper.constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, $scope.onGameObjectSelectionChanged, this);
            EventManager.subscribe(AngularHelper.constants.EVENTS.ASSET_SELECTION, $scope.onAssetSelected, this);
            EventManager.subscribe(AngularHelper.constants.EVENTS.OBJECTS_SELECTION, $scope.onObjectsSelected, this);
            EventManager.subscribe(CONSTANTS.EVENTS.CONTENT_ASSET_LOADED, $scope.onAssetLoaded, this);

        })();

        $scope.$on("$destroy", (function () {
            EventManager.removeSubscription(AngularHelper.constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, $scope.onGameObjectSelectionChanged);
            EventManager.removeSubscription(AngularHelper.constants.EVENTS.ASSET_SELECTION, $scope.onAssetSelected);
            EventManager.removeSubscription(AngularHelper.constants.EVENTS.OBJECTS_SELECTION, $scope.onObjectsSelected);
            EventManager.removeSubscription(CONSTANTS.EVENTS.CONTENT_ASSET_LOADED, $scope.onAssetLoaded);

        }).bind(this));
    }]
);