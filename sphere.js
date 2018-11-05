PI_2 = Math.PI / 2;

class Sphere {

    constructor(gl, vaoExt, vao, radius) {
        this.indices = [];
        this.vertices = [];
        this.normals = [];
        /*this.texcoords = [];*/
        this.currentSphereColor = [];
        this.rings = 16;
        this.sectors = 16;

        this.gl = gl;
        this.vaoExt = vaoExt;
        this.vao = vao;

        this.drawSphere(radius)
    }

    drawSphere(radius) {

        this.createSphere(radius);
        this.vaoExt.bindVertexArrayOES(this.vao);

        var ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

        var vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(inputPositionLocation, 3, gl.FLOAT, gl.FALSE, 3 * FLOAT_SIZE, 0);
        gl.enableVertexAttribArray(inputPositionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        var vboN = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vboN);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        gl.vertexAttribPointer(inputNormalLocation, 3, gl.FLOAT, gl.FALSE, 3 * FLOAT_SIZE, 0);
        gl.enableVertexAttribArray(inputNormalLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        /*var vboT = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vboT);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
        gl.vertexAttribUniform(inputTextureLocation, 2, gl.FLOAT, gl.FALSE, 2 * FLOAT_SIZE, 0);
        gl.enableVertexAttribArray(inputTextureLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);*/

        this.vaoExt.bindVertexArrayOES(null);
    }

    pushIndices(index, sectors, r, s) {
        index *= 6;
        var curRow = r * sectors;
        var nextRow = (r + 1) * sectors;
        var nextS = (s + 1) % sectors;

        this.indices[index] = curRow + s;
        this.indices[index + 1] = nextRow + s;
        this.indices[index + 2] = nextRow + nextS;

        this.indices[index + 3] = curRow + s;
        this.indices[index + 4] = nextRow + nextS;
        this.indices[index + 5] = curRow + nextS;
    }

    createSphere(radius) {

        var R = 1 / parseFloat(this.rings - 1);
        var S = 1 / parseFloat(this.sectors - 1);

        var index = 0;
        var uvIndex = 0;
        var indiceIndex = 0;

        for (var r = 0; r < this.rings; ++r) {
            for (var s = 0; s < this.sectors; ++s) {
                var y = Math.sin(-PI_2 + Math.PI * r * R);
                var x = Math.cos(2 * Math.PI * s * S) * Math.sin(Math.PI * r * R);
                var z = Math.sin(2 * Math.PI * s * S) * Math.sin(Math.PI * r * R);

                /*this.texcoords[uvIndex] = s * S;
                this.texcoords[uvIndex + 1] = r * R;*/

                this.vertices[index] = x * radius;
                this.vertices[index + 1] = y * radius;
                this.vertices[index + 2] = z * radius;

                this.normals[index] = x;
                this.normals[index + 1] = y;
                this.normals[index + 2] = z;

                if (r < this.rings - 1) {
                    this.pushIndices(indiceIndex, this.sectors, r, s);
                }

                indiceIndex++;
                index += 3;
                uvIndex += 2;
            }
        }
    }

}