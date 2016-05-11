app.controller('PropertyEditorCtrl', ['$scope', 'logSvc', 'config',
    function ($scope, logSvc, config) {

        function resetModel() {
            $scope.model = {
                propertyContainers: [],         // the property containers that will be displayed on the UI
                targets: [],                    // the given objects
                multipleTargets: false,         // flag value for easier access
                hiddenContainers: false         // when true, means some containers are missing (multi-selection)
            };
        }

        function getObjectOwnContainerProperties(object) {
            var properties = [];

            if (isObjectAssigned(object)) {
                var targetType = getType(object);
                var propertyNames = Object.getOwnPropertyNames(object);
                propertyNames.forEach(function (entry) {
                    if (entry.length > 0 && isObjectAssigned(object[entry])) {
                        var customRule = AttributeDictionary.getRule(targetType, entry) || {};

                        // is this property supposed to be visible?
                        if (customRule.hasOwnProperty("visible") && customRule.visible === false) {
                            // no ? ok.. leave!
                            return;
                        }

                        // show this property in its own container?
                        if (customRule.hasOwnProperty("ownContainer") && customRule.ownContainer === true) {
                            // yeap, add it
                            properties.push(entry);
                        }
                    }
                });
            }

            return properties;
        }

        function getObjectProperties(object) {
            var properties = [];

            if (isObjectAssigned(object)) {
                var targetType = getType(object);
                var propertyNames = Object.getOwnPropertyNames(object);
                propertyNames.forEach(function (entry) {
                    if (entry.length > 0 && isObjectAssigned(object[entry])) {
                        var customRule = AttributeDictionary.getRule(targetType, entry) || {};

                        // is this property supposed to be visible?
                        if ((customRule.hasOwnProperty("visible") && customRule.visible === false) ||
                            (customRule.hasOwnProperty("ownContainer") && customRule.ownContainer === true)) {
                            // no ? ok.. leave!
                            return;
                        }

                        var capitalName = capitalize(entry);
                        var valid = true;

                        var propertyModel = {
                            name: entry,
                            displayName: customRule.displayName || splitCamelCase(capitalName),
                            type: getType(object[entry]),
                            systemType: typeof object[entry],
                            bindOnce: false,
                            setter: customRule.setter,
                            getter: customRule.getter,
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
                                    // slice the name to remove the "_"
                                    propertyModel.displayName = splitCamelCase(capitalName);
                                    propertyModel.getter = object['get' + capitalName].bind(object);
                                    propertyModel.setter = object['set' + capitalName].bind(object);
                                }
                            }
                        }

                        if (valid) {
                            properties.push(propertyModel);
                        }
                    }
                });
            }

            return properties;
        }

        function createPropertyContainerFromObject(object) {
            var type = getType(object);
            return {
                target: object,
                displayName: splitCamelCase(capitalize(type)),
                type: type,
                open: true,
                properties: getObjectProperties(object)
            }
        }

        function getPropertyContainers(object) {
            var propertyContainers = [];
            propertyContainers.push(createPropertyContainerFromObject(object));

            var ownContainerProperties = getObjectOwnContainerProperties(object);
            ownContainerProperties.forEach(function (property) {
                propertyContainers.push(createPropertyContainerFromObject(object[property]));
            });

            return propertyContainers;
        }

        function addTarget(target) {
            var targetModel = {
                object: target,
                propertyContainers: getPropertyContainers(target)
            };

            $scope.model.targets.push(targetModel);
        }

        function containerTypeExists(containerType, containerHolder) {
            containerHolder.forEach(function (container) {
                if (container.type == containerType) {
                    return true;
                }
            });

            return false;
        }

        function getCommonContainers(targets) {
            // we need to lookup the containers that exist in all targets.
            // since they need to exist in all, there's no need to pick more than one target containers for comparison.
            var commonContainers = [];
            var baseContainers = targets[0].propertyContainers;
            var valid;

            for (var i = 0; i < baseContainers.length; i++) {
                valid = true;

                for (var j = 1; j < $scope.model.targets; j++) {
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
            for (var i = 0; i < containerHolder.length; i++) {
                if (containerHolder[i].type == type) {
                    return containerHolder[i];
                }
            }
            return null;
        }

        function getDifferentObjectProperties(objectA, objectB, property) {
            var differences = [];

            // this can only work if both objects are of the same kind and are both complex objects
            if (typeof objectA[property] !== "object" || (getType(objectA[property]) !== getType(objectB[property]))) {
                return differences;
            }

            // again, since these are both the same object type, they should have the same property names
            var propertyNames = Object.getOwnPropertyNames(objectA[property]);
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
            var unifiedContainers = getCommonContainers(targets);

            // now we need to look through every common container and specify which values aren't equal in all and
            // flag them so the user can know (UI must take benefit from this)
            unifiedContainers.forEach(function (aContainer) {
                // now let's get through the other targets containers and compare the property values for each.
                // note that [i] starts at '1' because we know the unifiedContainers was formed from the first target
                for (var i = 1; i < targets.length; i++) {
                    var bContainer = getContainerByType(targets[i].propertyContainers, aContainer.type);
                    // after all those validations it would be a shame if the following condition is false, but better
                    // be safe than sorry:
                    if (bContainer) {
                        // now that we have the comparison container, let's go through the properties themselves
                        for (var j = 0; j < bContainer.properties.length; j++) {
                            // note: since these are both containers of the same kind, it's safe to assume the array positions
                            // for the properties are the same..

                            // a difference for this particular property was already found?
                            // when true, it means there is no need to validate because one difference is enough
                            if (!aContainer.properties[j].hasDifferentAssignments) {
                                var va = $scope.getPropertyValue(aContainer, aContainer.properties[j]);
                                var vb = $scope.getPropertyValue(bContainer, bContainer.properties[j]);

                                if (isFunction(va.equals) && isFunction(vb.equals)) {
                                    // both values have the 'equals' function defined, let's use it!
                                    aContainer.properties[j].hasDifferentAssignments = !va.equals(vb);
                                } else {
                                    aContainer.properties[j].hasDifferentAssignments = va != vb;
                                }
                            }

                            // now let's find the properties that have different values
                            var propertyDifferences = getDifferentObjectProperties(aContainer.target, bContainer.target, aContainer.properties[j].name);

                            // since more than two objects can be selected, we can't just push the differences to the property
                            // 'differentProperties' array, we need to check if it wasn't already added.
                            propertyDifferences.forEach(function (propertyName) {
                                if (aContainer.properties[j].differentProperties.indexOf(propertyName) < 0) {
                                    aContainer.properties[j].differentProperties.push(propertyName);
                                }
                            });
                        }
                    }
                }
            });

            return unifiedContainers
        }

        $scope.syncValue = function (container, property, subPropertyName, value) {
            if (property.bindOnce || !isObjectAssigned(value) || (subPropertyName && !isObjectAssigned(value[subPropertyName]))) {
                return;
            }

            function syncToContainerAction(targetContainer) {
                var type = property.type.toLowerCase();

                var targetValue = value;

                // is this a multiple target selection and the sub properties aren't all equal?
                if ($scope.model.multipleTargets && subPropertyName && property.differentProperties.length > 0) {
                    // yes, so basically we need to update the subProperty values of each respective target
                    // and then assign the original value with that only modification
                    targetValue = targetContainer.target[property.name];
                    targetValue[subPropertyName] = value[subPropertyName];
                }

                if (property.setter) {
                    var rule = SetterDictionary.getRule(type);
                    // this setter has a definition applied?
                    if (rule) {
                        // yes, it means the setter will be made using the user applied order
                        var args = [];
                        rule.forEach(function (entry) {
                            if (isObjectAssigned(value[entry])) {
                                args.push(value[entry]);
                            }
                        });

                        property.setter.apply(targetContainer.target, args);
                    } else {
                        // TODO: log this to user
                    }
                } else {
                    targetContainer.target[property.name] = value;
                }
            }


            if ($scope.model.multipleTargets) {
                // this has a multiple target selection so all targets must be synced:
                $scope.model.targets.forEach(function (target) {
                    var targetContainer = getContainerByType(target.propertyContainers, container.type);
                    if (targetContainer) {
                        syncToContainerAction(targetContainer);
                    }
                });
            } else {
                syncToContainerAction(container);
            }

            // set the following variables to false since we just set the same value for all targets:
            property.hasDifferentAssignments = false;

            if (subPropertyName) {
                var index = property.differentProperties.indexOf(subPropertyName);
                if (index >= 0) {
                    property.differentProperties.splice(index, 1);
                }
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

            } else if ($scope.model.targets.length == 1) {
                $scope.model.propertyContainers = $scope.model.targets[0].propertyContainers;
            }

            if (forceRefresh) {
                $scope.$digest();
            }
        };

        $scope.toggleVisibility = function (target) {
            target.open = !target.open;
        };

        $scope.getEditorUrl = function (type) {
            // TODO: validate if the editor exists and cache the result
            return "templates/propertyEditor/editors/" + type.toLowerCase() + ".html";
        };

        (function init() {
            resetModel();
        })();
    }]
);

