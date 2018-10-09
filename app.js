'use strict';

function printDebug(message) {
    if(DEBUG_MODE) {
        console.log(message);
    }
}

var gl;
var vaoExt;
var ppFrameBuffer;
var mainShaderProgram;
var postShaderProgram;

function init() {
    gl = GlContext.getContext('surface');
    printDebug('initializing canvas...')
    fitCanvasInWindow();
    let shaderCompiler = new GlShaderCompiler(gl);
    vaoExt = (
        gl.getExtension('OES_vertex_array_object') ||
        gl.getExtension('MOZ_OES_vertex_array_object') ||
        gl.getExtension('WEBKIT_OES_vertex_array_object')
    );
    ppFrameBuffer = new FrameBuffer(gl, vaoExt);
    
    mainShaderProgram = shaderCompiler.compileShaderPair(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    postShaderProgram = shaderCompiler.compileShaderPair(VERTEX_SHADER_POST_PROCESSING_SOURCE, FRAGMENT_SHADER_POST_PROCESSING_SOURCE);
    run();
};

var vao;
var ibo;

var modelViewUniform;
var normalUniform;
var modelviewProjectionUniform;

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
    normalUniform =  new GlUniform(gl, mainShaderProgram, 'normalMat', GlUniform.MAT_4());
    modelviewProjectionUniform = new GlUniform(gl, mainShaderProgram, 'modelviewProjection', GlUniform.MAT_4());
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
    setUpCamera();

    printDebug('initializing mouse-handlers...');
    initMouseMoveHandler();

    render(0);

    printDebug('INITIALIZING FINISHED!');
};

var rotate = 0;
var then = 0;
var deltaTime = 0;

var animationDuration = 1;

function render(now) {
    if(animationDuration > 0) {
        animationDuration--;
        now *= 1.001;  //convert to seconds
        deltaTime = now - then;
        then = now;

        ppFrameBuffer.drawToBuffer(true);
        renderGeometry();
        ppFrameBuffer.drawToBuffer(false);
        renderFrame();

        rotate += Math.sin(now * 0.01) * 0.25;

        rotateCameraAbsolut(Math.cos(rotate*-0.01), Math.sin(rotate*0.05), Math.sin(rotate*-0.005));
        rotate += ROTATION_FACTOR * 50;
    }

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
        modelviewProjectionUniform.setValue(mat4modelviewProjection);

        inputColorUniform.setValue(vec4MODEL_COLORS[i]);

        gl.drawElements(gl.TRIANGLE_STRIP, VERTICES_COUNT_OF_SPHERE + 416, gl.UNSIGNED_SHORT, 0); //1440
    }

    vaoExt.bindVertexArrayOES(null);
}

var rand = 0.5;
var randCount = 0;

function renderFrame() {
    gl.useProgram(postShaderProgram);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //var rand = (Math.sin(rotate * 0.005)) * 0.3;

    if(randCount > 1500) {
        rand = Math.random();
        randCount = 0;
    } else {
        rand += randCount / 725;
    }
    randCount += deltaTime;

    frameRandUniform.setValue(rand);
    frameBufferTextureSamplerUniform.setValue(0);

    ppFrameBuffer.drawFrameFromBuffer();
}

function rotateModel(mat4model, index) {
	if(fMODEL_SPEEDS[index] == 0.0) {
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
    cameraMat.inverse();
    return cameraMat.get();
}

function calcViewProjection(view, projection) {
    return Mat4.multiply(projection, view);
}

function calcLookAt() {
    return Mat4.lookAt(vec3cameraPosition, vec3SUN_POSITION, vec3cameraUp);
}

function calcProjection() {
    var zNear = 0.01;
    var zFar = 1000;
	return Mat4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
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

function toRadians(angleDegree) {
    return angleDegree * (Math.PI / 180);
}

function vec3add(vec3a, vec3b) {
    return [vec3a[0] + vec3b[0],
            vec3a[1] + vec3b[1],
            vec3a[2] + vec3b[2]];
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

    var displayWidth  = Math.floor(gl.canvas.clientWidth  * realToCSSPixels);
    var displayHeight = Math.floor(gl.canvas.clientHeight * realToCSSPixels);

    if (canvas.width  != displayWidth || canvas.height != displayHeight) {
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
    }
    CANVAS_WIDTH = gl.canvas.width;
    CANVAS_HEIGHT = gl.canvas.height;
    aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    animationDuration += 1;
}

var indices = [];
var vertices = [];
var normals = [];
var texcoords = [];
var currentSphereColor = [];

var rings = 16;
var sectors = 16;
var PI_2 = Math.PI /2;

function pushIndices(index, sectors, r, s) {
	index *= 6;
	var curRow = r * sectors;
	var nextRow = (r + 1) * sectors;
	var nextS = (s + 1) % sectors;

	indices[index] = curRow + s;
	indices[index+1] = nextRow + s;
	indices[index+2] = nextRow + nextS;

	indices[index+3] = curRow + s;
	indices[index+4] = nextRow + nextS;
    indices[index+5] = curRow + nextS;
}

function createSphere(radius) {

	var R = 1 / parseFloat(rings - 1);
	var S = 1 / parseFloat(sectors - 1);

	var index = 0;
	var uvIndex = 0;
    var indiceIndex = 0;
    
	for (var r = 0; r < rings; ++r) {
		for (var s = 0; s < sectors; ++s) {
			var y = Math.sin(-PI_2 + Math.PI * r * R);
			var x = Math.cos(2 * Math.PI * s * S) * Math.sin(Math.PI * r * R);
			var z = Math.sin(2 * Math.PI * s * S) * Math.sin(Math.PI * r * R);

			texcoords[uvIndex] = s * S;
			texcoords[uvIndex +1] = r * R;

			vertices[index] = x * radius;
			vertices[index + 1] = y * radius;
			vertices[index + 2] = z * radius;

			normals[index] = x;
			normals[index + 1] = y;
			normals[index + 2] = z;

			if (r < rings - 1) {
                pushIndices(indiceIndex, sectors, r, s);
            }

			indiceIndex++;
			index += 3;
			uvIndex += 2;
		}
    }
}

var verticiesVBO;
var normalVBO;
var colorVBO;

function drawSphere(radius) {
       
	createSphere(radius);
    vaoExt.bindVertexArrayOES(vao);

    ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    var vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(inputPositionLocation, 3, gl.FLOAT, gl.FALSE, 3 * FLOAT_SIZE, 0);
    gl.enableVertexAttribArray(inputPositionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    var vboN = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vboN);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(inputNormalLocation, 3, gl.FLOAT, gl.FALSE, 3 * FLOAT_SIZE, 0);
    gl.enableVertexAttribArray(inputNormalLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    /*var vboT = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vboT);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
    gl.vertexAttribUniform(inputTextureLocation, 2, gl.FLOAT, gl.FALSE, 2 * FLOAT_SIZE, 0);
    gl.enableVertexAttribArray(inputTextureLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);*/

    vaoExt.bindVertexArrayOES(null);
}

function drawPlanets() {
	drawSphere(OBJECT_SCALE);
}

let cameraMat = new Mat4();
var fieldOfViewRadians = toRadians(60);

function rotateCameraAbsolut(rotX, rotY, rotZ) {
    cameraMat.set(getCameraInitMatRot());
    cameraMat.multiply(getCameraInitMatTrans());
    cameraMat.xRotate(toRadians(rotX));
    cameraMat.yRotate(toRadians(rotY));
    cameraMat.zRotate(toRadians(rotZ));
}

function setUpCamera() {
    cameraMat.set(getCameraInitMatRot());
    cameraMat.multiply(getCameraInitMatTrans());
}

function getCameraInitMatRot() {
    let newCameraMat = new Mat4();
    
    if(CANVAS_WIDTH > CANVAS_HEIGHT) {
        newCameraMat.zRotate(toRadians(-20));
    } else {
        newCameraMat.zRotate(toRadians(65));
    }
    return newCameraMat.get();
}

function getCameraInitMatTrans() {
    let newCameraMat = new Mat4();

    if(CANVAS_WIDTH > CANVAS_HEIGHT) {
        newCameraMat.translate(0.0, 0.0, 6.0);
    } else {
        newCameraMat.translate(0.0, 0.0, 7.0);
    }
    return newCameraMat.get();
}

function initMouseMoveHandler() {

    var allDiv = document.getElementById('all');
    var contentBoxIndex = 0;

    allDiv.onmousemove = function(ev) {
        /*var x = 0;
        var y = 0;

        var x = ev.clientX / CANVAS_WIDTH;
        var y = ev.clientY / CANVAS_HEIGHT;

        x *= CAMERA_MOVEMENT_FACTOR;
        y *= CAMERA_MOVEMENT_FACTOR;

        if(x != null && y != null) {
            rotateCameraAbsolut(y, x, 0.0);
        }*/
        animationDuration += 1;
    }

    allDiv.ontouchmove = function() {
        animationDuration += 1;
    }

    allDiv.onwheel = function(ev) {
        rotate += ROTATION_FACTOR * 100;
        var oldDiv = document.getElementById('link-' + contentBoxIndex);

        if(ev.deltaY < 0) {
            if(contentBoxIndex > 0) {
                contentBoxIndex--;

            }
        }
        if(ev.deltaY > 0) {
            if(contentBoxIndex < 5) {
                contentBoxIndex++;
            } 
        }
        animationDuration = 53;
        var newDiv = document.getElementById('link-' + contentBoxIndex);
        oldDiv.style.color = 'rgba(128, 128, 128, 0.0)';
        oldDiv.style.textShadow = '2px 2px rgba(0, 0, 0, 0.0)';
        newDiv.style.color = 'rgba(128, 128, 128, 1.0)';
        newDiv.style.textShadow = '2px 2px rgba(0, 0, 0, 1.0)';

        printDebug(contentBoxIndex);
    }
}

function resized() {
    fitCanvasInWindow();
    ppFrameBuffer.setUpRenderTexture();
}