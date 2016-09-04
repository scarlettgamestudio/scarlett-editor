function AngularHelper() {
}

AngularHelper.rootScope = null;

AngularHelper.constants = null;

AngularHelper.commandHistory = new Undo.Stack();

AngularHelper.sceneSvc = null;

AngularHelper.activeCanvas = null;

AngularHelper.isActiveCanvasFocused = function() {
  return AngularHelper.isElementFocused(AngularHelper.activeCanvas);
};

AngularHelper.isElementFocused = function (element) {
    return document.activeElement == element;
};

AngularHelper.focusElement = function (element) {
    element.focus();
};

AngularHelper.refresh = function () {
    if (!AngularHelper.rootScope) {
        return;
    }

    if (!AngularHelper.rootScope.$$phase) {
        AngularHelper.rootScope.$apply();
    }
};