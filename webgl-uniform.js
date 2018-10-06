'use strict';

class GlUniform {

    static MAT_4() {return "mat4";}
    static INT() {return "1i";}
    static FLOAT() {return "1f";}
    static VEC_4() {return "4f"}

    constructor(gl, shaderProgram, uniformName, uniformType) {
        this.gl = gl;
        this.uniformType = uniformType;
        this.uniformPointer =  this.gl.getUniformLocation(shaderProgram, uniformName);
    }

    setValue(newValue) {
        switch(this.uniformType) {
            case "mat4":
                this.gl.uniformMatrix4fv(this.uniformPointer, gl.FALSE, new Float32Array(newValue));
            break;

            case "1i":
                this.gl.uniform1i(this.uniformPointer, newValue);
            break;

            case "1f":
                this.gl.uniform1f(this.uniformPointer, newValue);
            break;

            case "4f":
                this.gl.uniform4fv(this.uniformPointer, newValue);
            break;

            default:
                console.error("Uniform type not implemented.");
        }
    }
}