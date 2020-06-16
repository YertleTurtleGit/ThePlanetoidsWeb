'use strict';

class GlContext {
    static getContext(CANVAS_ID) {
        printDebug('getting webgl context...');

        var canvas = document.getElementById(CANVAS_ID);
        var webglContext;

        webglContext = canvas.getContext("webgl");
        this.WEBGL_USED_CONTEXT = "webgl";

        printDebug('used context: ' + this.WEBGL_USED_CONTEXT);

        return webglContext;
    }
}