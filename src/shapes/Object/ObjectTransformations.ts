import { BBox } from '../../BBox/BBox';
import { iMatrix } from '../../constants';
import { ObjectEvents } from '../../EventTypeDefs';
import { Point } from '../../Point';
import type { TDegree, TMat2D, TOriginX, TOriginY } from '../../typedefs';
import {
  invertTransform,
  isMatrixEqual,
  multiplyTransformMatrices,
  createRotateMatrix,
  multiplyTransformMatrixArray,
} from '../../util/misc/matrix';
import { applyTransformToObject } from '../../util/misc/objectTransforms';
import { calcBaseChangeMatrix } from '../../util/misc/planeChange';
import { degreesToRadians } from '../../util/misc/radiansDegreesConversion';
import { resolveOriginPoint } from '../../util/misc/resolveOrigin';
import {
  createVector,
  getOrthogonalVector,
  getOrthonormalVector,
  getUnitVector,
} from '../../util/misc/vectors';
import { ObjectBBox } from './ObjectBBox';

type ObjectTransformOptions = {
  originX?: TOriginX;
  originY?: TOriginY;
  inViewport?: boolean;
};

export class ObjectTransformations<
  EventSpec extends ObjectEvents = ObjectEvents
> extends ObjectBBox<EventSpec> {
  /**
   * @returns {Point} position according to object's {@link originX} {@link originY} properties in canvas coordinate plane
   */
  getXY(
    originX: TOriginX = this.originX,
    originY: TOriginY = this.originY
  ): Point {
    return this.bbox
      .sendToCanvas()
      .pointFromOrigin(resolveOriginPoint(originX, originY));
  }

  /**
   * Set position to a particular point, in canvas coordinate.
   * You can specify {@link originX} and {@link originY} values,
   * that otherwise are the object's current values.
   * @example <caption>Set object's bottom left corner to point (5,5) on canvas</caption>
   * object.setXY(new Point(5, 5), 'left', 'bottom').
   * @see {@link translateTo}
   * @param {Point} point position in canvas coordinate plane
   * @param {TOriginX} [originX] Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginY} [originY] Vertical origin: 'top', 'center' or 'bottom'
   */
  setXY(
    point: Point,
    originX: TOriginX = this.originX,
    originY: TOriginY = this.originY
  ) {
    this.translateTo(point.x, point.y, { originX, originY, inViewport: false });
  }

  /**
   * Transforms object with respect to origin
   * @param transform
   * @param param1 options
   * @returns true if transform has changed
   */
  transformObject(
    transform: TMat2D,
    {
      originX = this.originX,
      originY = this.originY,
      inViewport = false,
    }: ObjectTransformOptions = {}
  ) {
    const ownTransformBefore = this.calcOwnMatrix();
    const transformCenter = (
      inViewport ? this.bbox : this.bbox.sendToCanvas()
    ).pointFromOrigin(resolveOriginPoint(originX, originY));
    const ownToTransformPlaneChange = multiplyTransformMatrixArray([
      [1, 0, 0, 1, -transformCenter.x, -transformCenter.y],
      inViewport ? this.getViewportTransform() : iMatrix,
      this.group?.calcTransformMatrix() || iMatrix,
    ]);
    const transformToOwnPlaneChange = invertTransform(
      ownToTransformPlaneChange
    );
    const ownTransformAfter = multiplyTransformMatrixArray([
      transformToOwnPlaneChange,
      transform,
      ownToTransformPlaneChange,
      ownTransformBefore,
    ]);

    if (!isMatrixEqual(ownTransformAfter, ownTransformBefore)) {
      // TODO: stop using decomposed values in favor of a matrix
      applyTransformToObject(this, ownTransformAfter);
      this.setCoords();
      if (this.group) {
        this.group.triggerLayout();
        this.group._set('dirty', true);
      }
      return true;
    }

    return false;
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

  translateTo(
    x: number,
    y: number,
    {
      originX = this.originX,
      originY = this.originY,
      inViewport = false,
    }: ObjectTransformOptions = {}
  ) {
    const delta = (
      inViewport ? this.bbox : this.bbox.sendToCanvas()
    ).getOriginTranslation(
      new Point(x, y),
      resolveOriginPoint(originX, originY)
    );
    return this.transformObject([1, 0, 0, 1, delta.x, delta.y], { inViewport });
  }

  scale(x: number, y: number, options?: ObjectTransformOptions) {
    const rotation = calcRotateMatrix({
      rotation: this.getTotalAngle(),
    });
    const [a, b, c, d] = options?.inViewport
      ? this.calcTransformMatrixInViewport()
      : this.calcTransformMatrix();
    return this.transformObject(
      multiplyTransformMatrixChain([
        rotation,
        [(x / a) * rotation[0], 0, 0, (y / d) * rotation[3], 0, 0],
        invertTransform(rotation),
      ]),
      options
    );
  }

  scaleBy(x: number, y: number, options?: ObjectTransformOptions) {
    const rotation = calcRotateMatrix({
      rotation: this.getTotalAngle(),
    });
    return this.transformObject(
      multiplyTransformMatrixChain([
        rotation,
        [x, 0, 0, y, 0, 0],
        invertTransform(rotation),
      ]),
      options
    );
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

  shear(x: number, y: number, options?: ObjectTransformOptions) {
    const bbox = BBox.bbox(this);
    const { tl, tr, bl } = (
      options?.inViewport ? bbox : bbox.sendToCanvas()
    ).getCoords();
    return this.shearSides(
      [createVector(tl, tr), createVector(tl, bl)],
      [y, x],
      options
    );
  }

  shearBy(x: number, y: number, options?: ObjectTransformOptions) {
    const bbox = BBox.transformed(this);
    const { tl, tr, bl } = (
      options?.inViewport ? bbox : bbox.sendToCanvas()
    ).getCoords();
    return this.shearSides(
      [
        getUnitVector(createVector(tl, tr)),
        getUnitVector(createVector(tl, bl)),
      ],
      [y, x],
      options
    );
  }

  protected shearSides(
    [vx, vy]: [Point, Point],
    [y, x]: [number, number],
    options?: ObjectTransformOptions
  ) {
    const xVector = getUnitVector(vx);
    const yVector = getUnitVector(vy);
    return this.shearSidesBy(
      [xVector, yVector],
      [
        getOrthonormalVector(xVector).scalarMultiply(y),
        getOrthonormalVector(yVector).scalarMultiply(x),
      ],
      options
    );
  }

  /**
   *
   * @param param0 2 vectors representing the sides of the object
   * @param param1 2 vectors representing the shearing offset affecting the 2 side vectors respectively (dy affects vx and dx affects vy)
   * @param options
   * @returns
   */
  shearSidesBy(
    [vx, vy]: [Point, Point],
    [dy, dx]: [Point, Point],
    options?: ObjectTransformOptions
  ) {
    const [a, b, c, d] = options?.inViewport
      ? this.calcTransformMatrixInViewport()
      : this.calcTransformMatrix();
    const xTVector = getUnitVector(new Point(a, b));
    const yTVector = getUnitVector(new Point(c, d));
    const newXVector = getUnitVector(vx.add(dy));
    const newYVector = getUnitVector(vy.add(dx));
    return this.transformObject(
      calcBaseChangeMatrix([xTVector, yTVector], [newXVector, newYVector]),
      options
    );
  }

  /**
   * Rotates object to angle
   * @param {TDegree} angle Angle value (in degrees)
   * @returns true if transform has changed
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
   * @returns true if transform has changed
   */
  rotateBy(angle: TDegree, options?: ObjectTransformOptions) {
    return this.transformObject(createRotateMatrix({ angle }), options);
  }

  rotate3D(
    x: TDegree,
    y: TDegree,
    z: TDegree,
    options?: ObjectTransformOptions
  ) {
    const transformed = BBox.transformed(this);
    const sideVectorX = transformed.vectorFromOrigin(new Point(1, 0));
    const sideVectorY = transformed.vectorFromOrigin(new Point(0, 1));
    return this.shearSidesBy(
      [sideVectorX, sideVectorY],
      [
        getOrthogonalVector(sideVectorX).scalarMultiply(
          Math.tan(degreesToRadians(x + z))
        ),
        getOrthogonalVector(sideVectorY).scalarMultiply(
          Math.tan(degreesToRadians(y + z))
        ),
      ],
      options
    );
  }

  flip(x: boolean, y: boolean, options?: ObjectTransformOptions) {
    return this.transformObject([x ? -1 : 1, 0, 0, y ? -1 : 1, 0, 0], options);
  }
}
