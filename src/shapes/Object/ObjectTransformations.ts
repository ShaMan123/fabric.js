import { BBox } from '../../BBox/BBox';
import { iMatrix } from '../../constants';
import { ObjectEvents } from '../../EventTypeDefs';
import { Point } from '../../Point';
import type {
  TAxis,
  TDegree,
  TMat2D,
  TOriginX,
  TOriginY,
} from '../../typedefs';
import {
  calcShearMatrix,
  multiplyTransformMatrices,
  invertTransform,
  createRotateMatrix,
  multiplyTransformMatrixArray,
} from '../../util/misc/matrix';
import { ObjectPosition } from './ObjectPosition';
import { degreesToRadians } from '../../util/misc/radiansDegreesConversion';
import { applyTransformToObject } from '../../util/misc/objectTransforms';
import { sendPointToPlane } from '../../util/misc/planeChange';

type ObjectTransformOptions = {
  originX?: TOriginX;
  originY?: TOriginY;
  inViewport?: boolean;
};

export class ObjectTransformations<
  EventSpec extends ObjectEvents = ObjectEvents
> extends ObjectPosition<EventSpec> {
  /**
   * Returns width of an object's bounding box counting transformations
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @deprecated
   * @return {Number} width value
   * @deprecated avoid decomposition, use {@link ObjectTransformations} instead
   */
  getScaledWidth(): number {
    return BBox.transformed(this).sendToCanvas().getDimensionsVector().x;
  }

  /**
   * Returns height of an object bounding box counting transformations
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @deprecated
   * @return {Number} height value
   * @deprecated avoid decomposition, use {@link ObjectTransformations} instead
   */
  getScaledHeight(): number {
    return BBox.transformed(this).sendToCanvas().getDimensionsVector().y;
  }

  scaleAxisTo(axis: TAxis, value: number, inViewport: boolean) {
    // adjust to bounding rect factor so that rotated shapes would fit as well
    const transformed = BBox.transformed(this)
      .sendToCanvas()
      .getDimensionsVector();
    const rotated = (
      !inViewport ? this.bbox.sendToCanvas() : this.bbox
    ).getDimensionsVector();
    const boundingRectFactor = rotated[axis] / transformed[axis];
    const scale =
      value / new Point(this.width, this.height)[axis] / boundingRectFactor;
    this.scale(scale, scale);
  }

  /**
   * Scales an object to a given width, with respect to bounding box (scaling by x/y equally)
   * @param {Number} value New width value
   * @param {Boolean} absolute ignore viewport
   * @return {void}
   * @deprecated use {@link scaleAxisTo}
   */
  scaleToWidth(value: number) {
    return this.scaleAxisTo('x', value, false);
  }

  /**
   * Scales an object to a given height, with respect to bounding box (scaling by x/y equally)
   * @param {Number} value New height value
   * @param {Boolean} absolute ignore viewport
   * @return {void}
   * @deprecated use {@link scaleAxisTo}
   */
  scaleToHeight(value: number) {
    return this.scaleAxisTo('y', value, false);
  }

  /**
   * Transforms object with respect to origin
   * @param transform
   * @param param1 options
   * @returns own transform
   */
  transformObjectInPlane(
    transform: TMat2D,
    {
      originX = this.originX,
      originY = this.originY,
      plane = iMatrix,
    }: {
      originX?: TOriginX;
      originY?: TOriginY;
      plane?: TMat2D;
    } = {}
  ) {
    const transformCenter = sendPointToPlane(
      this.getXY(originX, originY),
      undefined,
      plane
    );
    const ownTransform = multiplyTransformMatrixArray([
      invertTransform(plane),
      [1, 0, 0, 1, transformCenter.x, transformCenter.y],
      transform,
      [1, 0, 0, 1, -transformCenter.x, -transformCenter.y],
      plane,
      this.calcOwnMatrix(),
    ]);
    // TODO: stop using decomposed values in favor of a matrix
    applyTransformToObject(this, ownTransform);
    this.setCoords();
    return this.calcOwnMatrix();
  }

  /**
   * Transforms object with respect to origin
   * @param transform
   * @param param1 options
   * @returns own transform
   */
  transformObject(
    transform: TMat2D,
    {
      originX = this.originX,
      originY = this.originY,
      inViewport = false,
    }: ObjectTransformOptions = {}
  ) {
    return this.transformObjectInPlane(
      inViewport
        ? multiplyTransformMatrices(
            invertTransform(this.getViewportTransform()),
            transform
          )
        : transform,
      { originX, originY, plane: this.group?.calcTransformMatrix() }
    );
  }

  setObjectTransform(transform: TMat2D, options?: ObjectTransformOptions) {
    return this.transformObject(
      multiplyTransformMatrices(
        transform,
        invertTransform(
          options?.inViewport
            ? this.calcTransformMatrixInViewport()
            : this.calcTransformMatrix()
        )
      ),
      options
    );
  }

  translate(x: number, y: number, inViewport?: boolean) {
    return this.transformObject([1, 0, 0, 1, x, y], { inViewport });
  }

  scale(x: number, y: number, options?: ObjectTransformOptions) {
    const [a, b, c, d] = options?.inViewport
      ? this.calcTransformMatrixInViewport()
      : this.calcTransformMatrix();
    console.log(a, d);
    return this.transformObject([x / a, 0, 0, y / d, 0, 0], options);
  }

  scaleBy(x: number, y: number, options?: ObjectTransformOptions) {
    return this.transformObject([x, 0, 0, y, 0, 0], options);
  }

  skew(x: TDegree, y: TDegree, options?: ObjectTransformOptions) {
    return this.shear(
      Math.tan(degreesToRadians(x)),
      Math.tan(degreesToRadians(y)),
      options
    );
  }

  skewBy(x: TDegree, y: TDegree, options?: ObjectTransformOptions) {
    return this.shearBy(
      Math.tan(degreesToRadians(x)),
      Math.tan(degreesToRadians(y)),
      options
    );
  }

  // shear(x: number, y: number, options?: ObjectTransformOptions) {
  //   const { tl, tr, bl } = BBox.rotated2(this).getCoords();
  //   const unitX = getUnitVector(createVector(tl, tr));
  //   const unitY = getUnitVector(createVector(tl, bl));
  //   return this.transformObject(
  //     calcBaseChangeMatrix(
  //       [unitX, unitY],
  //       [unitX.add(unitY.scalarMultiply(y)), unitY.add(unitX.scalarMultiply(x))]
  //     ),
  //     options
  //   );
  // }

  shear(x: number, y: number, options?: ObjectTransformOptions) {
    const rotation = calcRotateMatrix({ rotation: this.bbox.getRotation() });
    return this.transformObject(
      multiplyTransformMatrixChain([
        rotation,
        [1, y, x, 1, 0, 0],
        invertTransform(rotation),
      ]),
      options
    );
  }

  shearBy(x: number, y: number, options?: ObjectTransformOptions) {
    return this.transformObject(
      calcShearMatrix({ shearX: x, shearY: y }),
      options
    );
  }

  /**
   * Rotates object to angle
   * @param {TDegree} angle Angle value (in degrees)
   * @returns own transform
   */
  rotate(angle: TDegree, options?: ObjectTransformOptions) {
    return this.transformObject(
      createRotateMatrix({
        rotation:
          degreesToRadians(angle) -
          (options?.inViewport
            ? this.bbox
            : this.bbox.sendToCanvas()
          ).getRotation(),
      }),
      options
    );
  }

  /**
   * Rotates object by angle
   * @param {TDegree} angle Angle value (in degrees)
   * @returns own transform
   */
  rotateBy(angle: TDegree, options?: ObjectTransformOptions) {
    return this.transformObject(createRotateMatrix({ angle }), options);
  }

  flip(x: boolean, y: boolean, options?: ObjectTransformOptions) {
    return this.transformObject([x ? -1 : 1, 0, 0, y ? -1 : 1, 0, 0], options);
  }
}
