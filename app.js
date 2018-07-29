'use strict';

var gl;

var vertexShaderSource =
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
    '}'    
].join('\n');

var fragmentShaderSource =
[
    '#version 300 es',

    'precision mediump float;',

    'smooth in vec3 normalInterp;',
    'smooth in vec3 vertPos;',
    'in vec4 vertColor;',

    'uniform bool bloom;',

    'const float lightPower = 8.0;',
    'const vec3 lightColor = vec3(1.0, 1.0, 1.0);',
    'const vec3 lightPos = vec3(0.0, 0.0, 0.0);',
    'const vec3 ambientColor = vec3(0.1, 0.1, 0.1);',
    'const vec3 diffuseColor = vec3(0.25, 0.25, 0.25);',
    'const vec3 specColor = vec3(1.0, 1.0, 1.0);',
    'const float shininess = 128.0;',
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

        'colorLinear -= lightColor * lightPower * distance * 0.0245;',
        'colorLinear += mix(colorLinear, vertColor.rgb, 0.9);',

        'float alpha = 1.0;',

        'if(bloom) {',
            
        '}',

        'vec3 colorGamma = pow(colorLinear, vec3(1.0/screenGamma));',

        'fragColor = vec4(colorGamma, alpha);',     
    '}'
].join('\n');

var shaderProgram;

var init = function() {
    //var vertexShaderSource = loadShaderSource(VERTEX_SHADER_PATH);
    //var fragmentShaderSource = loadShaderSource(FRAGMENT_SHADER_PATH);

    if(vertexShaderSource != null && fragmentShaderSource != null) {
        run(vertexShaderSource, fragmentShaderSource);
    }
};

function loadShaderSource(shaderPath) {
    var client = new XMLHttpRequest();
    client.open('GET', shaderPath);
    client.onreadystatechange = function() {
        return client.responseText;
    }
    client.send();
}

var vao;
var ibo;

//var projectionPointer;
var modelviewPointer;
var normalMatPointer;
var modelviewProjectionPointer;

var bloomPointer;
var randPointer;

var inputColorPointer;

var inputPositionLocation;
var inputNormalLocation;
//var inputTextureLocation;

var run = function(vertexShaderSource, fragmentShaderSource) {

    loadWebGL();

    vao = gl.createVertexArray();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    shaderProgram = loadShaders(vertexShaderSource, fragmentShaderSource);

    modelviewPointer =  gl.getUniformLocation(shaderProgram, 'modelView');
    normalMatPointer =  gl.getUniformLocation(shaderProgram, 'normalMat');
    modelviewProjectionPointer = gl.getUniformLocation(shaderProgram, 'modelviewProjection');

    bloomPointer = gl.getUniformLocation(shaderProgram, 'bloom');
    randPointer = gl.getUniformLocation(shaderProgram, 'rand');

    inputColorPointer = gl.getUniformLocation(shaderProgram, 'inputColor');

    inputPositionLocation = gl.getAttribLocation(shaderProgram, 'inputPosition');
    inputNormalLocation = gl.getAttribLocation(shaderProgram, 'inputNormal');
    //inputTextureLocation = gl.getAttribLocation(shaderProgram, 'inputTexCoord')

    gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LESS);

    setUpCamera();
    drawPlanets();

    render(0);

    console.log('End of run method reached.');
};

var rotate = 0;
var then = 0;
function render(now) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    now *= 1.001;  //convert to seconds
    const deltaTime = now - then;
    then = now;

    requestAnimationFrame(render);

    gl.useProgram(shaderProgram);

    rotate += ROTATION_FACTOR * deltaTime;

    gl.bindVertexArray(vao);

    for (var i = 0; i < MODEL_COUNT; i++) {
        //console.log('drawing element: ' + i);

        var rand = Math.random();

        var mat4model = calcModel(i);
        var mat4view = calcView();
        var mat4projection = calcProjection();
        var mat4modelview = calcModelView(mat4model, mat4view);
        var mat4modelviewProjection = calcModelViewProjection(mat4modelview, mat4projection);
        var mat4normal = calcNormal(mat4modelview);

        gl.uniformMatrix4fv(modelviewPointer, gl.FALSE, new Float32Array(mat4modelview));
        gl.uniformMatrix4fv(normalMatPointer, gl.FALSE, new Float32Array(mat4normal));
        gl.uniformMatrix4fv(modelviewProjectionPointer, gl.FALSE, new Float32Array(mat4modelviewProjection));

        gl.uniform4fv(inputColorPointer, new Float32Array(vec4MODEL_COLORS[i]));

        gl.uniform1f(randPointer, rand);

        if(i == SUN_INDEX) {
            gl.uniform1i(bloomPointer, 1);
        } else {
            gl.uniform1i(bloomPointer, 0);
        }
            
        //console.log(mat4normal);

        gl.drawElements(gl.TRIANGLE_STRIP, VERTICES_COUNT_OF_SPHERE + 416, gl.UNSIGNED_SHORT, 0); //1440
    }

    gl.bindVertexArray(null);
    //console.log('rendered frame');
    //optionally swap buffers
}

function rotateAround(mat4object, scale, vec3origin, vec3pivot, rotationFactor) {
    mat4object = m4.translate(mat4object, vec3pivot[0], vec3pivot[1], vec3pivot[2]);
    mat4object = m4.yRotate(mat4object, toRadians(rotate * rotationFactor));
	mat4object = m4.translate(mat4object, -vec3pivot[0], -vec3pivot[1], -vec3pivot[2]);
	mat4object = m4.translate(mat4object, vec3origin[0], vec3origin[1], vec3origin[2]);
	mat4object = m4.scale(mat4object, scale, scale, scale);
    mat4object = m4.translate(mat4object, vec3pivot[0] * rotationFactor, vec3pivot[1] * rotationFactor, vec3pivot[2] * rotationFactor);
    //console.log(mat4object);
	return mat4object;
}

function rotateModel(mat4model, index) {
	var rotatedModel = rotateAround(mat4model, fMODEL_SCALES[index], vec3MODEL_POSITIONS[index], vec3SUN_POSITION, 1.0);

	if (index == MOON_INDEX) {
		rotatedModel = rotateAround(rotatedModel, 1.0, vec3MODEL_POSITIONS[index], vec3EARTH_POSITION, 2.0);
		rotatedModel = rotateAround(rotatedModel, 1.0, vec3MODEL_POSITIONS[index], vec3EARTH_POSITION, 2.0);
	}

	return rotatedModel;
}

function calcModel(index) {
	return rotateModel(getIdentityMat4(), index);
}

function calcView() {
    //return calcLookAt();
    return m4.inverse(cameraMatrix);
}

function calcViewProjection(view, projection) {
    return m4.multiply(projection, view);
}

function calcLookAt() {
    //return m4.lookAt(vec3cameraPosition, vec3add(vec3cameraPosition, vec3cameraFront), vec3cameraUp);
    return m4.lookAt(vec3cameraPosition, vec3SUN_POSITION, vec3cameraUp);
}

function calcProjection() {
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 0.01;
    var zFar = 1000;
	return m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
	//return m4.projection(gl.canvas.clientWidth, gl.canvas.clientHeight, 400);
}

function calcModelView(model, view) {
	return m4.multiply(view, model);
}

function calcModelViewProjection(modelView, projection) {
	return m4.multiply(projection, modelView);
}

function calcNormal(modelView) {
    //return inverse(transpose(mat3(modelviewProjection)));
    return m4.transpose(m4.inverse(modelView));
}

function getIdentityMat4() {
    return [1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0];
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

function loadWebGL() {
    var canvas = document.getElementById('surface');
    gl = canvas.getContext('webgl2');

    if(!gl) {
        console.log('No webgl2-context found. Falling back to webgl2-experimental.');
        canvas.getContext('webgl2-experimental');
    }
    if(!gl) {
        console.error('No webgl2-context found!');
        return;
    }
    //fitCanvasInWindow(canvas, gl);
    //webglUtils.resizeCanvasToDisplaySize(gl.canvas);
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

var m4 = {

    lookAt: function(camPos, target, up) {
        var zAxis = vec3normalize(vec3sub(camPos, target));
        var xAxis = vec3cross(up, zAxis);
        var yAxis = vec3cross(zAxis, xAxis);
     
        return [
           xAxis[0], xAxis[1], xAxis[2], 1.0,
           yAxis[0], yAxis[1], yAxis[2], 1.0,
           zAxis[0], zAxis[1], zAxis[2], 1.0,
           camPos[0],
           camPos[1],
           camPos[2],
           1,
        ];
    },

    perspective: function(fieldOfViewInRadians, aspect, near, far) {
        var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
        var rangeInv = 1.0 / (near - far);
    
        return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1,
        0, 0, near * far * rangeInv * 2, 0
        ];
    },

    projection: function(width, height, depth) {
        return [
           2 / width, 0, 0, 0,
           0, -2 / height, 0, 0,
           0, 0, 2 / depth, 0,
          -1, 1, 0, 1,
        ];
    },

    transpose: function(m) {
        return [
          m[0], m[4], m[8], m[12],
          m[1], m[5], m[9], m[13],
          m[2], m[6], m[10], m[14],
          m[3], m[7], m[11], m[15],
        ];
    },

    translate: function(m, tx, ty, tz) {
        return m4.multiply(m, m4.translation(tx, ty, tz));
    },
     
    xRotate: function(m, angleInRadians) {
        return m4.multiply(m, m4.xRotation(angleInRadians));
    },
     
    yRotate: function(m, angleInRadians) {
        return m4.multiply(m, m4.yRotation(angleInRadians));
    },
     
    zRotate: function(m, angleInRadians) {
        return m4.multiply(m, m4.zRotation(angleInRadians));
    },
     
    scale: function(m, sx, sy, sz) {
        return m4.multiply(m, m4.scaling(sx, sy, sz));
    },

    translation: function(tx, ty, tz) {
      return [
         1,  0,  0,  0,
         0,  1,  0,  0,
         0,  0,  1,  0,
         tx, ty, tz, 1,
      ];
    },
   
    xRotation: function(angleInRadians) {
      var c = Math.cos(angleInRadians);
      var s = Math.sin(angleInRadians);
   
      return [
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1,
      ];
    },
   
    yRotation: function(angleInRadians) {
      var c = Math.cos(angleInRadians);
      var s = Math.sin(angleInRadians);
   
      return [
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1,
      ];
    },
   
    zRotation: function(angleInRadians) {
      var c = Math.cos(angleInRadians);
      var s = Math.sin(angleInRadians);
   
      return [
         c, s, 0, 0,
        -s, c, 0, 0,
         0, 0, 1, 0,
         0, 0, 0, 1,
      ];
    },
   
    scaling: function(sx, sy, sz) {
      return [
        sx, 0,  0,  0,
        0, sy,  0,  0,
        0,  0, sz,  0,
        0,  0,  0,  1,
      ];
    },

    multiply: function(a, b) {
        var a00 = a[0 * 4 + 0];
        var a01 = a[0 * 4 + 1];
        var a02 = a[0 * 4 + 2];
        var a03 = a[0 * 4 + 3];
        var a10 = a[1 * 4 + 0];
        var a11 = a[1 * 4 + 1];
        var a12 = a[1 * 4 + 2];
        var a13 = a[1 * 4 + 3];
        var a20 = a[2 * 4 + 0];
        var a21 = a[2 * 4 + 1];
        var a22 = a[2 * 4 + 2];
        var a23 = a[2 * 4 + 3];
        var a30 = a[3 * 4 + 0];
        var a31 = a[3 * 4 + 1];
        var a32 = a[3 * 4 + 2];
        var a33 = a[3 * 4 + 3];
        var b00 = b[0 * 4 + 0];
        var b01 = b[0 * 4 + 1];
        var b02 = b[0 * 4 + 2];
        var b03 = b[0 * 4 + 3];
        var b10 = b[1 * 4 + 0];
        var b11 = b[1 * 4 + 1];
        var b12 = b[1 * 4 + 2];
        var b13 = b[1 * 4 + 3];
        var b20 = b[2 * 4 + 0];
        var b21 = b[2 * 4 + 1];
        var b22 = b[2 * 4 + 2];
        var b23 = b[2 * 4 + 3];
        var b30 = b[3 * 4 + 0];
        var b31 = b[3 * 4 + 1];
        var b32 = b[3 * 4 + 2];
        var b33 = b[3 * 4 + 3];
        return [
          b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
          b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
          b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
          b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
          b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
          b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
          b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
          b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
          b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
          b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
          b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
          b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
          b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
          b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
          b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
          b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
        ];
      },

      inverse: function(m) {
        var m00 = m[0 * 4 + 0];
        var m01 = m[0 * 4 + 1];
        var m02 = m[0 * 4 + 2];
        var m03 = m[0 * 4 + 3];
        var m10 = m[1 * 4 + 0];
        var m11 = m[1 * 4 + 1];
        var m12 = m[1 * 4 + 2];
        var m13 = m[1 * 4 + 3];
        var m20 = m[2 * 4 + 0];
        var m21 = m[2 * 4 + 1];
        var m22 = m[2 * 4 + 2];
        var m23 = m[2 * 4 + 3];
        var m30 = m[3 * 4 + 0];
        var m31 = m[3 * 4 + 1];
        var m32 = m[3 * 4 + 2];
        var m33 = m[3 * 4 + 3];
        var tmp_0  = m22 * m33;
        var tmp_1  = m32 * m23;
        var tmp_2  = m12 * m33;
        var tmp_3  = m32 * m13;
        var tmp_4  = m12 * m23;
        var tmp_5  = m22 * m13;
        var tmp_6  = m02 * m33;
        var tmp_7  = m32 * m03;
        var tmp_8  = m02 * m23;
        var tmp_9  = m22 * m03;
        var tmp_10 = m02 * m13;
        var tmp_11 = m12 * m03;
        var tmp_12 = m20 * m31;
        var tmp_13 = m30 * m21;
        var tmp_14 = m10 * m31;
        var tmp_15 = m30 * m11;
        var tmp_16 = m10 * m21;
        var tmp_17 = m20 * m11;
        var tmp_18 = m00 * m31;
        var tmp_19 = m30 * m01;
        var tmp_20 = m00 * m21;
        var tmp_21 = m20 * m01;
        var tmp_22 = m00 * m11;
        var tmp_23 = m10 * m01;
    
        var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
            (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
        var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
            (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
        var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
            (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
        var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
            (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);
    
        var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
    
        return [
          d * t0,
          d * t1,
          d * t2,
          d * t3,
          d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
                (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
          d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
                (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
          d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
                (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
          d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
                (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
          d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
                (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
          d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
                (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
          d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
                (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
          d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
                (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
          d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
                (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
          d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
                (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
          d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
                (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
          d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
                (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
        ];
      },
    
  };

function fitCanvasInWindow(canvas) {
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHieght;

    canvas.width = windowWidth;
    canvas.width = windowHeight;
    gl.viewport(0, 0, windowWidth, windowHeight);
}

function loadShaders(vertexShaderSource, fragmentShaderSource) {
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.shaderSource(fragmentShader, fragmentShaderSource);

    compileShader(vertexShader);
    compileShader(fragmentShader);

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error while linking shader program!', gl.getProgramInfoLog(program));
        return;
    }

    //TODO: Remove when going online!
    gl.validateProgram(program);
    if(!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
        console.error('Error while validating program!', gl.getProgramInfoLog(program));
        return;
    }

    return program;
}

function compileShader(shader) {
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling shader!', gl.getShaderInfoLog(shader));
        return;
    }
}

var VERTICES_COUNT_OF_SPHERE = 32*32
var INDICE_COUNT_OF_SPHERE = 32*32*6

var FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;
var USHORT_SIZE = Float32Array.BYTES_PER_ELEMENT;

/*var indices = new Array(INDICE_COUNT_OF_SPHERE);
var vertices = new Array(VERTICES_COUNT_OF_SPHERE * 3);
var normals = new Array(VERTICES_COUNT_OF_SPHERE);
var texcoords = new Array(VERTICES_COUNT_OF_SPHERE * 2);
var currentSphereColor = new Array(VERTICES_COUNT_OF_SPHERE * 4);*/
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

function createSphere(radius)
{

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
    gl.vertexAttribPointer(inputTextureLocation, 2, gl.FLOAT, gl.FALSE, 2 * FLOAT_SIZE, 0);
    gl.enableVertexAttribArray(inputTextureLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);*/

    gl.bindVertexArray(null);
}

//var GLOBAL_TRANSLATION = [-150, 0, -360];
var GLOBAL_TRANSLATION = [0.0, 0.0, 0.0];

var OBJECT_SCALE = 1.0;
//var SPACE_SCALE = 1.0;
var ROTATION_FACTOR = 0.04;

var MODEL_COUNT = 4;
var SUN_INDEX = 0;
var EARTH_INDEX = 1;
var PLANETX_INDEX = 2;
var MOON_INDEX = 3;

var vec3SUN_POSITION = vec3add([0.0, 0.0, 0.0], GLOBAL_TRANSLATION);
var vec3EARTH_POSITION = vec3add([2.5, 0.0, 0.0], GLOBAL_TRANSLATION);
var vec3PLANETX_POSITION = vec3add([4.0, 0.0, 0.0], GLOBAL_TRANSLATION);
var vec3MOON_POSITION = vec3add([2.25, 0.0, 0.0], GLOBAL_TRANSLATION);

var SUN_SCALE = 1.5;
var EARTH_SCALE = 0.2;
var PLANETX_SCALE = 0.125;
var MOON_SCALE = 0.05;

var vec4SUN_COLOR = [1.0, 1.0, 1.0, 1.0];
var vec4EARTH_COLOR = [0.0, 0.1, 0.0, 1.0];
var vec4PLANETX_COLOR = [0.1, 0.0, 0.0, 1.0];
var vec4MOON_COLOR = [0.1, 0.1, 0.1, 1.0];

var vec3MODEL_POSITIONS = [ vec3SUN_POSITION,
                            vec3EARTH_POSITION,
                            vec3PLANETX_POSITION,
                            vec3MOON_POSITION];

var fMODEL_SCALES = [   SUN_SCALE,
                        EARTH_SCALE,
                        PLANETX_SCALE,
                        MOON_SCALE];

var vec4MODEL_COLORS = [vec4SUN_COLOR,
                        vec4EARTH_COLOR,
                        vec4PLANETX_COLOR,
                        vec4MOON_COLOR];

function drawPlanets() {
	drawSphere(OBJECT_SCALE);
}

var cameraMatrix;
var fieldOfViewRadians = toRadians(60);

function setUpCamera() {
    var cameraAngleRadians = toRadians(0);
     
    // Compute a matrix for the camera
    cameraMatrix = m4.yRotation(cameraAngleRadians);
    cameraMatrix = m4.translate(cameraMatrix, 0, 0, 7.5);
}
