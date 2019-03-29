'use strict';

class GlContext {
    static getContext(CANVAS_ID) {
        printDebug('getting webgl context...');
        const WEBGL_CONTEXT_NAMES = ['webgl', 'experimental-webgl', 'webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'];

        var canvas = document.getElementById(CANVAS_ID);
        var webglContext;

        var index = 0;
        while (!webglContext) {
            if (index > WEBGL_CONTEXT_NAMES.length) {
                WEBGL_USED_CONTEXT = null;
                return null;
            }
            webglContext = canvas.getContext(WEBGL_CONTEXT_NAMES[index]);
            this.WEBGL_USED_CONTEXT = WEBGL_CONTEXT_NAMES[index];
            index++;

            printDebug('used context: ' + this.WEBGL_USED_CONTEXT);
        }
        return webglContext;
    }
}