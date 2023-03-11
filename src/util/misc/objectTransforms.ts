import { Point } from '../../Point';
import type { TMat2D } from '../../typedefs';
import type { ObjectGeometry } from '../../shapes/Object/ObjectGeometry';
import { makeBoundingBoxFromPoints } from './boundingBoxFromPoints';
import {
  invertTransform,
  multiplyTransformMatrices,
  qrDecompose,
} from './matrix';

/**
 * given an object and a transform, apply the inverse transform to the object,
 * this is equivalent to remove from that object that transformation, so that
 * added in a space with the removed transform, the object will be the same as before.
 * Removing from an object a transform that scale by 2 is like scaling it by 1/2.
 * Removing from an object a transform that rotate by 30deg is like rotating by 30deg
 * in the opposite direction.
 * This util is used to add objects inside transformed groups or nested groups.
 * @param {ObjectGeometry} object the object you want to transform
 * @param {TMat2D} transform the destination transform
 */
export const removeTransformFromObject = (
  object: ObjectGeometry,
  transform: TMat2D
) => {
  const inverted = invertTransform(transform),
    finalTransform = multiplyTransformMatrices(
      inverted,
      object.calcOwnMatrix()
    );
  applyTransformToObject(object, finalTransform);
};

/**
 * given an object and a transform, apply the transform to the object.
 * this is equivalent to change the space where the object is drawn.
 * Adding to an object a transform that scale by 2 is like scaling it by 2.
 * This is used when removing an object from an active selection for example.
 * @param {ObjectGeometry} object the object you want to transform
 * @param {Array} transform the destination transform
 */
export const addTransformToObject = (
  object: ObjectGeometry,
  transform: TMat2D
) =>
  applyTransformToObject(
    object,
    multiplyTransformMatrices(transform, object.calcOwnMatrix())
  );

/**
 * discard an object transform state and apply the one from the matrix.
 * @param {ObjectGeometry} object the object you want to transform
 * @param {Array} transform the destination transform
 */
export const applyTransformToObject = (
  object: ObjectGeometry,
  transform: TMat2D
) => {
  const { translateX, translateY, scaleX, scaleY, ...otherOptions } =
      qrDecompose(transform),
    center = new Point(translateX, translateY);
  object.flipX = false;
  object.flipY = false;
  Object.assign(object, otherOptions);
  object.set({ scaleX, scaleY });
  object.setRelativeCenterPoint(center);
};
/**
 * reset an object transform state to neutral. Top and left are not accounted for
 * @param  {ObjectGeometry} target object to transform
 */
export const resetObjectTransform = (target: ObjectGeometry) => {
  target.scaleX = 1;
  target.scaleY = 1;
  target.skewX = 0;
  target.skewY = 0;
  target.flipX = false;
  target.flipY = false;
  target.rotate(0);
};

/**
 * Extract Object transform values
 * @param  {ObjectGeometry} target object to read from
 * @return {Object} Components of transform
 */
export const saveObjectTransform = (target: ObjectGeometry) => ({
  scaleX: target.scaleX,
  scaleY: target.scaleY,
  skewX: target.skewX,
  skewY: target.skewY,
  angle: target.angle,
  left: target.left,
  flipX: target.flipX,
  flipY: target.flipY,
  top: target.top,
});

/**
 * given a width and height, return the size of the bounding box
 * that can contains the box with width/height with applied transform.
 * Use to calculate the boxes around objects for controls.
 * @param {Number} width
 * @param {Number} height
 * @param {TMat2D} t
 * @returns {Point} size
 */
export const sizeAfterTransform = (
  width: number,
  height: number,
  t: TMat2D
) => {
  const dimX = width / 2,
    dimY = height / 2,
    points = [
      new Point(-dimX, -dimY),
      new Point(dimX, -dimY),
      new Point(-dimX, dimY),
      new Point(dimX, dimY),
    ].map((p) => p.transform(t)),
    bbox = makeBoundingBoxFromPoints(points);
  return new Point(bbox.width, bbox.height);
};
