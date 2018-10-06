'use strict';

const VERTEX_SHADER_SOURCE =
        [
        '#version 300 es',

        'in vec3 inputPosition;',
        'in vec2 inputTexCoord;',
        'in vec3 inputNormal;',
        
        'uniform mat4 modelview, normalMat, modelviewProjection;',
        'uniform vec4 inputColor;',

        'uniform float rand;',
        
        'smooth out vec3 normalInterp;',
        'smooth out vec3 vertPos;',
        'out vec4 vertColor;',

        'out vec2 uv;',

        'void main(){',
            'gl_Position = modelviewProjection * vec4(inputPosition, 1.0);',
            'vec4 vertPos4 = modelviewProjection * vec4(inputPosition, 1.0);',
            'vertPos = vertPos4.xyz / vertPos4.w;',
            'normalInterp = vec3(normalMat * vec4(inputNormal, 0.0));',
            'vertColor = inputColor;',
            'uv = inputTexCoord;',
        '}'    
        ].join('\n');
const FRAGMENT_SHADER_SOURCE =
        [
        '#version 300 es',

        'precision mediump float;',

        'smooth in vec3 vertPos;',
        'smooth in vec3 normalInterp;',
        'in vec4 vertColor;',

        'in vec2 uv;',

        'uniform sampler2D frameBufferTextureSampler;',

        'const float lightPower = 7.85;',
        'const vec3 lightColor = vec3(1.0, 1.0, 1.0);',
        'const vec3 lightPos = vec3(0.0, 0.0, 0.0);',
        'const vec3 ambientColor = vec3(0.1, 0.1, 0.1);',
        'const vec3 diffuseColor = vec3(0.25, 0.25, 0.25);',
        'const vec3 specColor = vec3(1.0, 1.0, 1.0);',
        'const float shininess = 16.0;',
        'const float screenGamma = 2.2;',

        'out vec4 fragColor;',

        'void main() {',

            'vec3 normal = normalize(normalInterp);',
            'vec3 lightDir = normalize(lightPos - vertPos);',
            'float distance = length(lightDir);',

            'float lambertian = max(dot(lightDir, normal), 0.0);',
            'float specular = 0.0;',

            'if(lambertian > 0.0) {',
                'vec3 viewDir = normalize(-vertPos);',

                'vec3 halfDir = normalize(lightDir + viewDir);',
                'float specAngle = max(dot(halfDir, normal), 0.0);',
                'specular = pow(specAngle, shininess);',
            '}',

            'vec3 colorLinear = ambientColor +',
                                'lambertian * diffuseColor * lightColor * lightPower / distance +',
                                'specular * specColor * lightColor * lightPower / distance;',

            'colorLinear -= lightColor * lightPower * distance * 0.023;',
            'colorLinear += mix(colorLinear, vertColor.rgb, 0.9);',

            'float alpha = 1.0;',

            'vec3 colorGamma = pow(colorLinear, vec3(1.0/screenGamma));',

            'fragColor = vec4(colorGamma, alpha);',     
        '}'
        ].join('\n');
const VERTEX_SHADER_POST_PROCESSING_SOURCE =
        [
        '#version 300 es',

        'in vec2 inputPosition;',
        'in vec2 inputTexCoord;',

        'out vec2 uv;',
        'out vec2 blurCoords[5];',

        'void main(){',
            'gl_Position = vec4(inputPosition, 0.0, 1.0);',
            'uv = inputTexCoord;',

            'vec2 singleStepOffset = vec2(0.002, 0.002);',
            'blurCoords[0] = inputTexCoord.xy;',
            'blurCoords[1] = inputTexCoord.xy + singleStepOffset * 1.407333;',
            'blurCoords[2] = inputTexCoord.xy - singleStepOffset * 1.407333;',
            'blurCoords[3] = inputTexCoord.xy + singleStepOffset * 3.294215;',
            'blurCoords[4] = inputTexCoord.xy - singleStepOffset * 3.294215;',
        '}'    
        ].join('\n');
const FRAGMENT_SHADER_POST_PROCESSING_SOURCE =
        [
        '#version 300 es',

        'precision mediump float;',

        'in vec2 uv;',
        'in vec2 blurCoords[5];',
        'uniform float rand;',

        'uniform sampler2D frameBufferTextureSampler;',

        'out vec4 fragColor;',

        'float random (vec2 st) {',
            'return fract(sin(dot(st.xy, vec2(12.9898,78.233)))*43758.5453123);',
        '}',

        'void main() {',
            'vec4 white = vec4(1.0, 1.0, 1.0, 1.0);',
            'vec4 black = vec4(0.5, 0.5, 0.5, 1.0);',
            'fragColor = texture(frameBufferTextureSampler, uv);',

            'lowp vec4 sum = vec4(0.0);',
            'sum += texture(frameBufferTextureSampler, blurCoords[0]) * 0.204164;',
            'sum += texture(frameBufferTextureSampler, blurCoords[1]) * 0.304005;',
            'sum += texture(frameBufferTextureSampler, blurCoords[2]) * 0.304005;',
            'sum += texture(frameBufferTextureSampler, blurCoords[3]) * 0.093913;',
            'sum += texture(frameBufferTextureSampler, blurCoords[4]) * 0.093913;',
            'fragColor += sum;',
            
            'if(rand-(0.2*rand) <= uv.y) {',
                'if(uv.y <= rand+(0.2*rand)) {',
                    'fragColor = mix(texture(frameBufferTextureSampler, vec2(uv.x+0.006, uv.y)), black, 0.1 * rand);',
                '}',
            '}',

            'float grain = random(uv.xy/vec2(rand, rand));',
            'fragColor = mix(fragColor, vec4(grain, grain, grain, 1.0), 0.15 + (rand * 0.003));',
        '}'
        ].join('\n');

var gl;
var mainShaderProgram;
var postShaderProgram;

function init() {
    gl = GlContext.getContext('surface');
    let shaderCompiler = new GlShaderCompiler(gl);
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

    vao = gl.createVertexArray();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

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

    console.log('fitCanvasInWindow');
    fitCanvasInWindow();
    console.log('drawPlanets');
    drawPlanets();
    console.log('setUpRenderTexture');
    setUpRenderTexture();
    console.log('prepareFrame');
    prepareFrame();
    console.log('setUpCamera');
    setUpCamera();
    console.log('initMouseMoveHandler');
    initMouseMoveHandler();

    render(0);

    console.log('End of run method reached.');
};

var rotate = 0;
var then = 0;
var deltaTime = 0;

function render(now) {

    now *= 1.001;  //convert to seconds
    deltaTime = now - then;
    then = now;

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    renderGeometry();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    renderFrame(frameBufferTexture);

    rotate += ROTATION_FACTOR * deltaTime;

    requestAnimationFrame(render);
}

function renderGeometry() {
    gl.useProgram(mainShaderProgram);
    //gl.uniform1i(frameBufferTextureSamplerUniform, 0);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindVertexArray(vao);

    for (var i = 0; i < MODEL_COUNT; i++) {
        var mat4model = calcModel(i);
        var mat4view = calcView();
        var mat4projection = calcProjection();
        var mat4modelview = calcModelView(mat4model, mat4view);
        var mat4modelviewProjection = calcModelViewProjection(mat4modelview, mat4projection);
        var mat4normal = calcNormal(mat4modelview);

        modelViewUniform.setValue(mat4modelview);
        normalUniform.setValue(mat4normal);
        modelviewProjectionUniform.setValue(mat4modelviewProjection);

        inputColorUniform.setValue(vec4MODEL_COLORS[i]);

        gl.drawElements(gl.TRIANGLE_STRIP, VERTICES_COUNT_OF_SPHERE + 416, gl.UNSIGNED_SHORT, 0); //1440
    }

    gl.bindVertexArray(null);
}

var rand = 0.5;
var randCount = 0;

function renderFrame(frameTexture) {
    gl.useProgram(postShaderProgram);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //var rand = (Math.sin(rotate * 0.005)) * 0.3;

    if(randCount > 1000) {
        rand = Math.random();
        randCount = 0;
    } else {
        rand += randCount / 1000;
    }
    randCount += deltaTime;


    frameRandUniform.setValue(rand);
    frameBufferTextureSamplerUniform.setValue(0);

    gl.bindVertexArray(vaoFrame);
    gl.bindTexture(gl.TEXTURE_2D, frameTexture);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

var vaoFrame;

function prepareFrame() {
    var frameVerticies = [  1.0,  1.0,
                            -1.0,  1.0,
                            -1.0, -1.0,
                            -1.0, -1.0,
                            1.0, -1.0,
                            1.0,  1.0];

    var frameTextCoords = [ 1.0,  1.0,
                            0.0,  1.0,
                            0.0, 0.0,
                            0.0, 0.0,
                            1.0, 0.0,
                            1.0,  1.0];

    vaoFrame = gl.createVertexArray()
    gl.bindVertexArray(vaoFrame);

    var vboFrameV = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboFrameV);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(frameVerticies), gl.STATIC_DRAW);
    gl.vertexAttribPointer(frameInputPositionLocation, 2, gl.FLOAT, gl.FALSE, 2 * FLOAT_SIZE, 0);
    gl.enableVertexAttribArray(frameInputPositionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    var vboFrameT = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboFrameT);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(frameTextCoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(frameInputTextureLocation, 2, gl.FLOAT, gl.FALSE, 2 * FLOAT_SIZE, 0);
    gl.enableVertexAttribArray(frameInputTextureLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindVertexArray(null);
}

function rotateModel(mat4model, index) {
	if(fMODEL_SPEEDS[index] == 0.0) {
        return mat4model;
    }
    let rotatedModel = new Mat4(mat4model);
	if (index == MOON_INDEX) {
        rotatedModel.rotateAround(vec3SUN_POSITION, rotate, fMODEL_SPEEDS[EARTH_INDEX], vec3MODEL_POSITIONS[index], fMODEL_SCALES[index]);
        rotatedModel.rotateAround(vec3EARTH_POSITION, rotate, fMODEL_SPEEDS[index], vec3MODEL_POSITIONS[index], fMODEL_SCALES[index]);
        rotatedModel.rotateAround(vec3EARTH_POSITION, rotate, fMODEL_SPEEDS[index], fMODEL_SPEEDS[index], vec3MODEL_POSITIONS[index], 1.0);
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
    tmpMat4ModelView.inverseTranspose();
    return tmpMat4ModelView.get();
}

function toRadians(angleDegree) {
    return angleDegree * (Math.PI / 180);
}

function getMat4FromMat3(mat3) {
    var mat4 = [mat3[0], mat3[1], mat3[2], 0,
                mat3[3], mat3[4], mat3[5], 0,
                mat3[6], mat3[7], mat3[8], 0,
                0      , 0      , 0      , 1];
    return mat4;
}

function vec3normalize(vec3v) {
    var length = Math.sqrt(vec3v[0] * vec3v[0] + vec3v[1] * vec3v[1] + vec3v[2] * vec3v[2]);
    // make sure we don't divide by 0.
    if (length > 1.00001) {
        return [vec3v[0] / length, vec3v[1] / length, vec3v[2] / length];
    } else {
        return [0, 0, 0];
    }
}

function vec3cross(vec3a, vec3b) {
    return [vec3a[1] * vec3b[2] - vec3a[2] * vec3b[1],
            vec3a[2] * vec3b[0] - vec3a[0] * vec3b[2],
            vec3a[0] * vec3b[1] - vec3a[1] * vec3b[0]];
}

function vec3add(vec3a, vec3b) {
    return [vec3a[0] + vec3b[0],
            vec3a[1] + vec3b[1],
            vec3a[2] + vec3b[2]];
}

function vec3sub(vec3a, vec3b) {
    return [vec3a[0] - vec3b[0],
            vec3a[1] - vec3b[1],
            vec3a[2] - vec3b[2]];
}

var CANVAS_WIDTH;
var CANVAS_HEIGHT;
var aspect;

function fitCanvasInWindow() {
    var canvas = gl.canvas;
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
}

var VERTICES_COUNT_OF_SPHERE = 32*32
var INDICE_COUNT_OF_SPHERE = 32*32*6

var FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;
var USHORT_SIZE = Float32Array.BYTES_PER_ELEMENT;

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
    gl.bindVertexArray(vao);

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

    gl.bindVertexArray(null);
}

//var GLOBAL_TRANSLATION = [-150, 0, -360];
var GLOBAL_TRANSLATION = [0.0, 0.0, 0.0];

var OBJECT_SCALE = 1.5;
//var SPACE_SCALE = 1.0;
var ROTATION_FACTOR = 0.04;

var MODEL_COUNT = 4;
var SUN_INDEX = 0;
var EARTH_INDEX = 1;
var PLANETX_INDEX = 2;
var MOON_INDEX = 3;

var vec3SUN_POSITION = vec3add([0.0, 0.0, 0.0], GLOBAL_TRANSLATION);
var vec3EARTH_POSITION = vec3add([-2.5, 0.0, 0.0], GLOBAL_TRANSLATION);
var vec3PLANETX_POSITION = vec3add([-3.5, 0.0, 0.0], GLOBAL_TRANSLATION);
var vec3MOON_POSITION = vec3add([-2.25, 0.0, 0.0], GLOBAL_TRANSLATION);

var SUN_SCALE = 0.7;
var EARTH_SCALE = 0.2;
var PLANETX_SCALE = 0.125;
var MOON_SCALE = 0.05;

var SUN_SPEED = 0.0;
var EARTH_SPEED = 1.0;
var PLANETX_SPEED = 1.2;
var MOON_SPEED = 2.0;

var vec4SUN_COLOR = [1.0, 1.0, 1.0, 1.0];
var vec4EARTH_COLOR = [0.1, 0.1, 0.1, 1.0];
var vec4PLANETX_COLOR = [0.09, 0.09, 0.09, 1.0];
var vec4MOON_COLOR = [0.1, 0.1, 0.1, 1.0];

var vec3MODEL_POSITIONS = [ vec3SUN_POSITION,
                            vec3EARTH_POSITION,
                            vec3PLANETX_POSITION,
                            vec3MOON_POSITION];

var fMODEL_SCALES = [   SUN_SCALE,
                        EARTH_SCALE,
                        PLANETX_SCALE,
                        MOON_SCALE];

var fMODEL_SPEEDS = [SUN_SPEED,
                    EARTH_SPEED,
                    PLANETX_SPEED,
                    MOON_SPEED];

var vec4MODEL_COLORS = [vec4SUN_COLOR,
                        vec4EARTH_COLOR,
                        vec4PLANETX_COLOR,
                        vec4MOON_COLOR];

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

var frameBuffer;
var frameBufferTexture;

function setUpRenderTexture() {

    frameBufferTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, frameBufferTexture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const data = null;
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                            CANVAS_WIDTH, CANVAS_HEIGHT, border,
                            format, type, data);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, frameBufferTexture, level);

    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
     
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, CANVAS_WIDTH, CANVAS_HEIGHT);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
}

var CAMERA_MOVEMENT_FACTOR = -3.0;

function initMouseMoveHandler() {
    gl.canvas.onmousemove = function(ev) {
        var x = 0;
        var y = 0;

        var x = ev.clientX / CANVAS_WIDTH;
        var y = ev.clientY / CANVAS_HEIGHT;

        x *= CAMERA_MOVEMENT_FACTOR;
        y *= CAMERA_MOVEMENT_FACTOR;

        if(x != null && y != null) {
            rotateCameraAbsolut(y, x, 0.0);
        }
    }

    var onDeviceReady=function(){
     
        intel.xdk.device.hideSplashScreen();
    
        function onAccelerationChanged(acceleration){
            var x = acceleration.x;
            var y = acceleration.y;
            var z = acceleration.z;

            x *= ROTATION_FACTOR;
            y *= ROTATION_FACTOR;
            z *= ROTATION_FACTOR;

            rotateCameraAbsolut(x,y,z);
        };
    
        var options = { frequency: 100, adjustForRotation: true  };
        intel.xdk.accelerometer.watchAcceleration(onAccelerationChanged, options);
    }
}

function resized() {
    fitCanvasInWindow();
    setUpRenderTexture();
}