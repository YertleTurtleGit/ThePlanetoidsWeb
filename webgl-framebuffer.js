'use strict';

class FrameBuffer {

    constructor(gl, vaoExt) {
        this.gl = gl;
        this.vaoExt = vaoExt;
        this.prepareFrame();
        this.setUpRenderTexture();
    }

    drawToBuffer(active) {
        if (active) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
    }

    drawFrameFromBuffer() {
        this.vaoExt.bindVertexArrayOES(this.vaoFrame);
        gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        vaoExt.bindVertexArrayOES(null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    prepareFrame() {
        const frameVerticies = [ 1.0,  1.0,
                                -1.0,  1.0,
                                -1.0, -1.0,
                                -1.0, -1.0,
                                1.0, -1.0,
                                1.0,  1.0];
    
        const frameTextCoords = [1.0,  1.0,
                                0.0,  1.0,
                                0.0, 0.0,
                                0.0, 0.0,
                                1.0, 0.0,
                                1.0,  1.0];


        this.vaoFrame = vaoExt.createVertexArrayOES()
        vaoExt.bindVertexArrayOES(this.vaoFrame);
    
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
    
        vaoExt.bindVertexArrayOES(null);
    }

    setUpRenderTexture() {
        this.frameTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);
    
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
    
        this.frameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.frameTexture, level);
    
        const depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
         
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, CANVAS_WIDTH, CANVAS_HEIGHT);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.activeTexture(gl.TEXTURE0);
    }
}