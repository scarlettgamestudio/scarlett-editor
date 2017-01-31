/**
 * Created by Luis on 03/09/2016.
 */

app.directive('selectText', function($timeout) {
    return {
        scope: { arg: '@selectText' },
        link: function(scope, element) {
            scope.$watch('arg', function(value) {
                element[0].focus();

                // get argument trimmed length
                let valueLength = value.toString().trim().length;

                // if the argument is an empty string, select all of it
                if(valueLength === 0) {
                    element[0].select();
                }
                else {
                    // get extension
                    let extension = Path.getFileExtension(value);
                    // store extension length
                    let extensionLength = extension.trim().length;
                    // select until extension
                    element[0].setSelectionRange(0, valueLength - extensionLength);
                }
            });
        }
    };
});