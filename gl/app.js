'use strict';

function printDebug(message) {
    if (DEBUG_MODE) {
        console.log(message);
    }
}

var gl;
var vaoExt;
var ppFrameBuffer;
var mainShaderProgram;
var postShaderProgram;

function init() {
    printDebug('DEBUG MODE IS ON');

    printDebug('initializing canvas...');
    gl = GlContext.getContext(CANVAS_ID);
    let shaderCompiler = new GlShaderCompiler(gl);
    vaoExt = (
        gl.getExtension('OES_vertex_array_object') ||
        gl.getExtension('MOZ_OES_vertex_array_object') ||
        gl.getExtension('WEBKIT_OES_vertex_array_object')
    );
    ppFrameBuffer = new FrameBuffer(gl, vaoExt);

    mainShaderProgram = shaderCompiler.compileShaderPair(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    postShaderProgram = shaderCompiler.compileShaderPair(VERTEX_SHADER_POST_PROCESSING_SOURCE, FRAGMENT_SHADER_POST_PROCESSING_SOURCE);
    fitCanvasInWindow();
    run();

    printDebug('loading images...');
    var cometImageElem = document.getElementById('title-comet');

    let cometImage = new Image(2069, 713);

    cometImage.onload = function () {
        printDebug('comet.png loaded!');
        cometImageElem.style.opacity = 1;
        cometImageElem.style.transform = 'translate(0vh, 0vh) rotate(42deg)';
    };
    cometImage.src = 'comet.png';
    cometImageElem.src = cometImage.src;
};

var vao;

var modelViewUniform;
var normalUniform;
var modelViewProjectionUniform;

var frameRandUniform;

var inputColorUniform;

var inputPositionLocation;
var inputNormalLocation;
var inputTextureLocation;
var frameBufferTextureSamplerUniform;


var frameInputPositionLocation;
var frameInputTextureLocation;

function run() {

    vao = vaoExt.createVertexArrayOES();

    gl.clearColor(BACKGROUND_COLOR[0], BACKGROUND_COLOR[1], BACKGROUND_COLOR[2], BACKGROUND_COLOR[3]);

    modelViewUniform = new GlUniform(gl, mainShaderProgram, 'modelview', GlUniform.MAT_4());
    normalUniform = new GlUniform(gl, mainShaderProgram, 'normalMat', GlUniform.MAT_4());
    modelViewProjectionUniform = new GlUniform(gl, mainShaderProgram, 'modelviewProjection', GlUniform.MAT_4());
    inputColorUniform = new GlUniform(gl, mainShaderProgram, 'inputColor', GlUniform.VEC_4());

    inputPositionLocation = gl.getAttribLocation(mainShaderProgram, 'inputPosition');
    inputNormalLocation = gl.getAttribLocation(mainShaderProgram, 'inputNormal');
    inputTextureLocation = gl.getAttribLocation(mainShaderProgram, 'inputTexCoord');

    frameRandUniform = new GlUniform(gl, postShaderProgram, 'rand', GlUniform.FLOAT());
    frameBufferTextureSamplerUniform = new GlUniform(gl, postShaderProgram, 'frameBufferTextureSampler', GlUniform.INT());

    frameInputPositionLocation = gl.getAttribLocation(postShaderProgram, 'inputPosition');
    frameInputTextureLocation = gl.getAttribLocation(postShaderProgram, 'inputTexCoord');

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    printDebug('drawing...');
    drawPlanets();

    printDebug('setting up render texture...');
    ppFrameBuffer.setUpRenderTexture();

    printDebug('preparing frame...');
    ppFrameBuffer.prepareFrame();

    printDebug('setting up Camera...');
    camera = new Camera(60);

    printDebug('initializing mouse-handlers...');
    initMouseMoveHandler();

    render(0);

    printDebug('INITIALIZING FINISHED!');

    //rotatePlanets(1125); //behind the sun

};

var rotate = 0;
var then = 0;
var deltaTime = 0;

var camRelRotX = 0;
var camRelRotY = 0;
var camRelRotZ = 0;

var camera;

var animationDuration = 0;

function render(now) {

    now *= 1.001;
    deltaTime = now - then;
    then = now;

    ppFrameBuffer.drawToBuffer(true);
    renderGeometry();
    ppFrameBuffer.drawToBuffer(false);
    renderFrame();

    if (ROTATION_OFFSET >= animationDuration && animationDuration >= -ROTATION_OFFSET) {
        rotate += (Math.sin(now * 0.01) * 0.025) * deltaTime;
        animationDuration = 0;
    } else if (animationDuration > 0) {
        animationDuration -= deltaTime;
        rotate += ROTATION_FACTOR * deltaTime * animationDuration;
    } else if (animationDuration < 0) {
        animationDuration += deltaTime;
        rotate -= ROTATION_FACTOR * deltaTime * animationDuration;
    }

    camera.rotateCameraAbsolute(camRelRotX, camRelRotY, camRelRotZ);
    requestAnimationFrame(render);
}

function renderGeometry() {
    gl.useProgram(mainShaderProgram);
    //gl.uniform1i(frameBufferTextureSamplerUniform, 0);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    vaoExt.bindVertexArrayOES(vao);

    var mat4view = calcView();
    var mat4projection = calcProjection();

    for (var i = 0; i < MODEL_COUNT; i++) {
        var mat4model = calcModel(i);
        var mat4modelview = calcModelView(mat4model, mat4view);
        var mat4modelviewProjection = calcModelViewProjection(mat4modelview, mat4projection);
        var mat4normal = calcNormal(mat4modelview);

        modelViewUniform.setValue(mat4modelview);
        normalUniform.setValue(mat4normal);
        modelViewProjectionUniform.setValue(mat4modelviewProjection);

        inputColorUniform.setValue(vec4MODEL_COLORS[i]);

        gl.drawElements(gl.TRIANGLE_STRIP, VERTICES_COUNT_OF_SPHERE, gl.UNSIGNED_SHORT, 0);
    }

    vaoExt.bindVertexArrayOES(null);
}

var rand = 0.5;
var randCount = 0;
var randCountMax = 250;

function renderFrame() {
    gl.useProgram(postShaderProgram);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    rand += deltaTime * 0.004;

    if (rand >= Math.PI * 100) {
        rand = 0;
    }

    frameRandUniform.setValue(rand);
    frameBufferTextureSamplerUniform.setValue(0);

    ppFrameBuffer.drawFrameFromBuffer();
}

function rotateModel(mat4model, index) {
    if (fMODEL_SPEEDS[index] == 0.0) {
        return mat4model;
    }
    let rotatedModel = new Mat4(mat4model);
    if (index == MOON_INDEX) {
        rotatedModel.rotateAround(vec3SUN_POSITION, rotate, fMODEL_SPEEDS[EARTH_INDEX], vec3MODEL_POSITIONS[index], fMODEL_SCALES[index]);
        rotatedModel.rotateAround(vec3EARTH_POSITION, rotate, fMODEL_SPEEDS[index], vec3MODEL_POSITIONS[index], 1.0);
        rotatedModel.rotateAround(vec3EARTH_POSITION, rotate, fMODEL_SPEEDS[index], vec3MODEL_POSITIONS[index], 1.0);
    } else {
        rotatedModel.rotateAround(vec3SUN_POSITION, rotate, fMODEL_SPEEDS[index], vec3MODEL_POSITIONS[index], fMODEL_SCALES[index]);
    }
    return rotatedModel.get();
}

function calcModel(index) {
    return rotateModel(Mat4.identity(), index);
}

function calcView() {
    return camera.getMat().inverse();
}

function calcViewProjection(view, projection) {
    return Mat4.multiply(projection, view);
}

function calcProjection() {
    var zNear = 0.01;
    var zFar = 1000;
    return Mat4.perspective(camera.getFieldOfViewRadian(), aspect, zNear, zFar);
}

function calcModelView(model, view) {
    return Mat4.multiply(view, model);
}

function calcModelViewProjection(modelView, projection) {
    return Mat4.multiply(projection, modelView);
}

function calcNormal(modelView) {
    let tmpMat4ModelView = new Mat4(modelView);
    return tmpMat4ModelView.inverseTranspose();
}

function vec3add(vec3a, vec3b) {
    return [vec3a[0] + vec3b[0],
    vec3a[1] + vec3b[1],
    vec3a[2] + vec3b[2]
    ];
}

var CANVAS_WIDTH;
var CANVAS_HEIGHT;
var aspect;

function fitCanvasInWindow() {
    var canvas = gl.canvas;
    var realToCSSPixels = window.devicePixelRatio;
    canvas.width = document.width / DIRTY_SCALING_FACTOR;
    canvas.height = document.height / DIRTY_SCALING_FACTOR;
    canvas.style.transform = 'scale3d(' + DIRTY_SCALING_FACTOR + ', ' + DIRTY_SCALING_FACTOR + ', 1.0)';
    canvas.style.transformOrigin = '0 0 0';

    var realToCSSPixels = window.devicePixelRatio;

    var displayWidth = Math.floor(gl.canvas.clientWidth * realToCSSPixels);
    var displayHeight = Math.floor(gl.canvas.clientHeight * realToCSSPixels);

    if (canvas.width != displayWidth || canvas.height != displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
    CANVAS_WIDTH = gl.canvas.width;
    CANVAS_HEIGHT = gl.canvas.height;
    aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    animationDuration += 1;
}

function drawPlanets() {
    new Sphere(gl, vaoExt, vao, OBJECT_SCALE);
}

function keyDown(keyDownEvent) {
    keyDownEvent = keyDownEvent || window.event;

    var keyCode = keyDownEvent.keyCode;

    printDebug('KEY PRESS!');

    if (keyCode == '38') {
        // up arrow
        prevMenuItem();
    }
    else if (keyCode == '40') {
        // down arrow
        nextMenuItem();
    }
    else if (keyCode == '37') {
        // left arrow
        prevMenuItem();
    }
    else if (keyCode == '39') {
        // right arrow
        nextMenuItem();
    }
}

function swipedetect(el, callback) {

    var touchsurface = el,
        swipedir,
        startX,
        startY,
        distX,
        distY,
        threshold = 50, //required min distance traveled to be considered swipe
        restraint = 300, // maximum distance allowed at the same time in perpendicular direction
        allowedTime = 300, // maximum time allowed to travel that distance
        elapsedTime,
        startTime,
        handleswipe = callback || function (swipedir) { }

    touchsurface.addEventListener('touchstart', function (e) {
        var touchobj = e.changedTouches[0]
        swipedir = 'none'
        var dist = 0
        startX = touchobj.pageX
        startY = touchobj.pageY
        startTime = new Date().getTime() // record time when finger first makes contact with surface
        e.preventDefault()
    }, false)

    touchsurface.addEventListener('touchmove', function (e) {
        e.preventDefault() // prevent scrolling when inside DIV
    }, false)

    touchsurface.addEventListener('touchend', function (e) {
        var touchobj = e.changedTouches[0]
        distX = touchobj.pageX - startX // get horizontal dist traveled by finger while in contact with surface
        distY = touchobj.pageY - startY // get vertical dist traveled by finger while in contact with surface
        elapsedTime = new Date().getTime() - startTime // get time elapsed
        if (elapsedTime <= allowedTime) { // first condition for awipe met
            if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) { // 2nd condition for horizontal swipe met
                swipedir = (distX < 0) ? 'left' : 'right' // if dist traveled is negative, it indicates left swipe
            } else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint) { // 2nd condition for vertical swipe met
                swipedir = (distY < 0) ? 'up' : 'down' // if dist traveled is negative, it indicates up swipe
            }
        }
        handleswipe(swipedir)
        e.preventDefault()
    }, false)
}

function rotatePlanets(rotationValue) {
    animationDuration = rotationValue;
}

var lastMenuItemChanged = 0;
var lastChangedMenuItemIndex = 0;
var contentBoxIndex = 0;

const minIndex = 1;
const maxIndex = 6;

function prevMenuItem() {
    if (contentBoxIndex > minIndex) {
        contentBoxIndex--;
    } else if (contentBoxIndex == minIndex) {
        contentBoxIndex = maxIndex;
    }
    changeMenuItem(contentBoxIndex);
}

function nextMenuItem() {
    if (contentBoxIndex < maxIndex) {
        contentBoxIndex++;
    } else if (contentBoxIndex == maxIndex) {
        contentBoxIndex = minIndex;
    }
    changeMenuItem(contentBoxIndex);
}

function changeMenuItem(newIndex) {
    var itemChangeThreshold = 150;
    var now = new Date().getTime();

    if (newIndex == 0 || contentBoxIndex == 0) {
        newIndex = minIndex;
    }

    var oldIndex = lastChangedMenuItemIndex;
    var extraRotationValue = 0;

    if (lastMenuItemChanged + itemChangeThreshold < now) {

        if (oldIndex != 0) {
            var oldDot = document.getElementById('link-dot-' + oldIndex);
            oldDot.style.color = 'rgba(255, 255, 255, 1.0)';

        } else {
            var linkTitle = document.getElementById('link-0');
            var cometTitle = document.getElementById('title-comet');
            var linkDots = document.getElementsByClassName('link-dot');

            linkTitle.style.opacity = '0';
            cometTitle.style.transform = 'translate(100vh, 100vh) rotate(42deg)';

            for (var i = 0; i < linkDots.length; i++) {
                var linkDot = linkDots[i];
                linkDot.style.color = 'rgba(255, 255, 255, 1.0)';
            }
            extraRotationValue = 100;
        }

        var oldDiv = document.getElementById('link-' + oldIndex);
        var newDiv = document.getElementById('link-' + newIndex);
        var newDot = document.getElementById('link-dot-' + newIndex);
        oldDiv.style.color = 'rgba(255, 255, 255, 0.0)';
        oldDiv.style.zIndex = -1;
        newDiv.style.zIndex = 999;
        newDiv.style.color = 'rgba(255, 255, 255, 1.0)';
        newDot.style.color = 'black';

        lastMenuItemChanged = now;
        lastChangedMenuItemIndex = newIndex;
        contentBoxIndex = newIndex;

        if (newIndex - oldIndex < 0) {
            rotatePlanets(-(ROTATION_VALUE + extraRotationValue));
        } else if (newIndex - oldIndex > 0) {
            rotatePlanets(ROTATION_VALUE + extraRotationValue);
        }
    } else {
        contentBoxIndex = oldIndex;
    }
}

function initMouseMoveHandler() {

    var allDiv = document.getElementById('all');

    swipedetect(allDiv, function (swipedir) {
        if (swipedir == 'up' || swipedir == 'left') {
            prevMenuItem();
        } else if (swipedir == 'down' || swipedir == 'right') {
            nextMenuItem();
        }
    })

    allDiv.onmousemove = function (ev) {
        var x = ev.clientX / CANVAS_WIDTH;
        var y = ev.clientY / CANVAS_HEIGHT;
        camRelRotX = (y - 1.0) * MOUSE_MOVE_CAMERA_SHIFT_FACTOR;
        camRelRotY = (x - 1.0) * MOUSE_MOVE_CAMERA_SHIFT_FACTOR;
        camRelRotZ = 0.0;
    }

    allDiv.onwheel = function (ev) {
        if (ev.deltaY < 0) {
            prevMenuItem();
        }
        if (ev.deltaY > 0) {
            nextMenuItem();
        }
    }
}

function resized() {
    fitCanvasInWindow();
    ppFrameBuffer.setUpRenderTexture();
}
