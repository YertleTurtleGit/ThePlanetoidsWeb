'use strict';

/* Depends on class Mat4 */
/* Depends on class cMath */
class Camera {

    constructor(fieldOfViewDegree) {
        this.cameraMat = new Mat4();
        this.fieldOfViewRadian = cMath.toRadians(fieldOfViewDegree);
    }
    
    getFieldOfViewRadian() {
        return this.fieldOfViewRadian;
    }

    getMat() {
        return this.cameraMat;
    }

    rotateCameraAbsolute(rotX, rotY, rotZ) {
        this.cameraMat.set(this.getCameraInitMatRot());
        this.cameraMat.multiply(this.getCameraInitMatTrans());
        this.cameraMat.xRotate(cMath.toRadians(rotX));
        this.cameraMat.yRotate(cMath.toRadians(rotY));
        this.cameraMat.zRotate(cMath.toRadians(rotZ));
    }
    
    setUpCamera() {
        this.cameraMat.set(this.getCameraInitMatRot());
        this.cameraMat.multiply(this.getCameraInitMatTrans());
    }
    
    getCameraInitMatRot() {
        let newCameraMat = new Mat4();
    
        if (CANVAS_WIDTH > CANVAS_HEIGHT) {
            newCameraMat.zRotate(cMath.toRadians(-20));
        } else {
            newCameraMat.zRotate(cMath.toRadians(65));
        }
        return newCameraMat.get();
    }
    
    getCameraInitMatTrans() {
        let newCameraMat = new Mat4();
    
        if (CANVAS_WIDTH > CANVAS_HEIGHT) {
            newCameraMat.translate(0.0, 0.0, 6.0);
        } else {
            newCameraMat.translate(0.0, 0.0, 7.0);
        }
        return newCameraMat.get();
    }

}