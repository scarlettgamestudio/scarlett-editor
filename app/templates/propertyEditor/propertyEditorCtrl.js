app.controller('PropertyEditorCtrl', ['$scope', 'logSvc', 'config',
	function ($scope, logSvc, config) {
		$scope.model = {
			targets: []
		};

		$scope.getEditorUrl = function(type) {
			return "templates/propertyEditor/editors/" + type.toLowerCase() + ".html";
		};

		$scope.setTargets = function (targets, forceRefresh) {
			$scope.model.targets = [];
			targets.forEach(function (entry) {
				$scope.addTarget(entry, false)
			});

			if (forceRefresh) {
				$scope.$digest();
			}
		};

		$scope.toggleVisibility = function(target) {
			target.open = !target.open;
		};

		$scope.addTarget = function (target, forceRefresh) {
			var currentTargetsLength = $scope.model.targets.length;
			var targetModel = {
				target: target,
				targetTitle: splitCamelCase(capitalize(getType(target))),
				open: true,
				properties: $scope.getTargetProperties(target)
			};

			$scope.model.targets.insert(currentTargetsLength, targetModel);

			if (forceRefresh) {
				$scope.$digest();
			}
		};

		$scope.getTargetProperties = function (target) {
			// the target is an object?
			if (isObjectAssigned(target)) {
				// the object defines the properties?
				var properties = [];
				var targetType = getType(target);

				if (isFunction(target.getObjectProperties)) {
					return target.getObjectProperties();
				} else {
					// since the object doesn't manually set the properties information, we need to evaluate the object
					// and construct the details ourselves:
					var propertyNames = Object.getOwnPropertyNames(target);
					propertyNames.forEach(function (entry) {
						if (entry.length > 0 && isObjectAssigned(target[entry])) {
							var customRule = AttributeDictionary.getRule(targetType, entry) || {};

							// is this property supposed to be visible?
							if (customRule.hasOwnProperty("visible") && customRule.visible === false) {
								// no ? ok.. leave!
								return;
							}

							// show this property in its own container?
							if (customRule.hasOwnProperty("ownContainer") && customRule.ownContainer === true) {
								$scope.addTarget(target[entry], false);
								return;
							}

							var capitalName = capitalize(entry);
							var valid = true;

							var propertyModel = {
								name: entry,
								displayName: customRule.displayName || splitCamelCase(capitalName),
								type: getType(target[entry]),
								bindOnce: false,
								setter: customRule.setter,
								getter: customRule.getter
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
									if (!target["set" + capitalName] || !target['get' + capitalName]) {
										valid = false;
									} else {
										// slice the name to remove the "_"
										propertyModel.displayName = splitCamelCase(capitalName);
										propertyModel.getter = target['get' + capitalName].bind(target);
										propertyModel.setter = target['set' + capitalName].bind(target);
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

			return null;
		}
	}]
);

