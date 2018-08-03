'use strict';

class GlShaderCompiler {

    constructor(gl) {
        this.gl = gl;
    }

    compileShader(shader) {
        this.gl.compileShader(shader);
        if(!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('ERROR compiling shader!', this.gl.getShaderInfoLog(shader));
            return;
        }
    }

    compileShaderPair(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE) {
        var vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        var fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    
        this.gl.shaderSource(vertexShader, VERTEX_SHADER_SOURCE);
        this.gl.shaderSource(fragmentShader, FRAGMENT_SHADER_SOURCE);
    
        this.compileShader(vertexShader);
        this.compileShader(fragmentShader);
    
        var program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
    
        if(!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Error while linking shader program!', gl.getProgramInfoLog(program));
            return;
        }
    
        //TODO: Remove when going online!
        this.gl.validateProgram(program);
        if(!this.gl.getProgramParameter(program, this.gl.VALIDATE_STATUS)) {
            console.error('Error while validating program!', this.gl.getProgramInfoLog(program));
            return;
        }
    
        return program;
    }

}