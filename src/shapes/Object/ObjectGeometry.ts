import { Canvas } from '../../canvas/Canvas';
import { StaticCanvas } from '../../canvas/StaticCanvas';
import { iMatrix } from '../../constants';
import { ObjectEvents } from '../../EventTypeDefs';
import { Intersection } from '../../Intersection';
import { Point } from '../../Point';
import type {
  TAxis,
  TBBox,
  TDegree,
  TMat2D,
  TOriginX,
  TOriginY,
} from '../../typedefs';
import { mapValues } from '../../util/internals';
import {
  calcPlaneRotation,
  createRotateMatrix,
  invertTransform,
  multiplyTransformMatrices,
  multiplyTransformMatrixArray,
  qrDecompose,
} from '../../util/misc/matrix';
import type { ControlProps } from './types/ControlProps';
import { getUnitVector, rotateVector } from '../../util/misc/vectors';
import { makeBoundingBoxFromPoints } from '../../util/misc/boundingBoxFromPoints';
import { BBox, TRotatedBBox } from '../../BBox/BBox';
import { CanvasBBox } from '../../BBox/CanvasBBox';
import { ObjectLayout } from './ObjectLayout';
import { FillStrokeProps } from './types/FillStrokeProps';
import { resolveOriginPoint } from '../../util/misc/resolveOrigin';

type TMatrixCache = {
  key: string;
  value: TMat2D;
};

export class ObjectGeometry<EventSpec extends ObjectEvents = ObjectEvents>
  extends ObjectLayout<EventSpec>
  implements
    Pick<FillStrokeProps, 'strokeWidth' | 'strokeUniform'>,
    Pick<ControlProps, 'padding'>
{
  declare strokeWidth: number;
  declare strokeUniform: boolean;
  declare padding: number;

  declare bbox: TRotatedBBox;

  /**
   * A Reference of the Canvas where the object is actually added
   * @type StaticCanvas | Canvas;
   * @default undefined
   * @private
   */
  declare canvas?: StaticCanvas | Canvas;

  skipOffscreen = true;

  /**
   * Override this method if needed
   */
  needsViewportCoords() {
    return this.strokeUniform || !this.padding;
  }

  getCanvasRetinaScaling() {
    return this.canvas?.getRetinaScaling() || 1;
  }

  /**
   * Retrieves viewportTransform from Object's canvas if possible
   * @method getViewportTransform
   * @memberOf FabricObject.prototype
   * @return {TMat2D}
   */
  getViewportTransform(): TMat2D {
    return this.canvas?.viewportTransform || (iMatrix.concat() as TMat2D);
  }

  protected calcDimensionsVector(
    origin = new Point(1, 1),
    {
      applyViewportTransform = this.needsViewportCoords(),
    }: {
      applyViewportTransform?: boolean;
    } = {}
  ) {
    const vpt = applyViewportTransform ? this.getViewportTransform() : iMatrix;
    const dimVector = origin
      .multiply(new Point(this.width, this.height))
      .add(origin.scalarMultiply(!this.strokeUniform ? this.strokeWidth : 0))
      .transform(
        multiplyTransformMatrices(vpt, this.calcTransformMatrix()),
        true
      );
    const strokeUniformVector = getUnitVector(dimVector).scalarMultiply(
      this.strokeUniform ? this.strokeWidth : 0
    );
    return dimVector.add(strokeUniformVector);
  }

  protected calcCoord(
    origin: Point,
    {
      offset = new Point(),
      applyViewportTransform = this.needsViewportCoords(),
      padding = 0,
    }: {
      offset?: Point;
      applyViewportTransform?: boolean;
      padding?: number;
    } = {}
  ) {
    const vpt = applyViewportTransform ? this.getViewportTransform() : iMatrix;
    const offsetVector = rotateVector(
      offset.add(origin.scalarMultiply(padding * 2)),
      calcPlaneRotation(this.calcTransformMatrix())
    );
    const realCenter = this.getCenterPoint().transform(vpt);
    return realCenter
      .add(this.calcDimensionsVector(origin, { applyViewportTransform }))
      .add(offsetVector);
  }

  /**
   * Calculates the coordinates of the 4 corner of the bbox
   * @return {TCornerPoint}
   */
  calcCoords() {
    // const size = new Point(this.width, this.height);
    // return projectStrokeOnPoints(
    //   [
    //     new Point(-0.5, -0.5),
    //     new Point(0.5, -0.5),
    //     new Point(-0.5, 0.5),
    //     new Point(0.5, 0.5),
    //   ].map((origin) => origin.multiply(size)),
    //   {
    //     ...this,
    //     ...qrDecompose(
    //       multiplyTransformMatrices(
    //         this.needsViewportCoords() ? this.getViewportTransform() : iMatrix,
    //         this.calcTransformMatrix()
    //       )
    //     ),
    //   }
    // );

    return mapValues(
      {
        tl: new Point(-0.5, -0.5),
        tr: new Point(0.5, -0.5),
        bl: new Point(-0.5, 0.5),
        br: new Point(0.5, 0.5),
      },
      (origin) => this.calcCoord(origin)
    );
  }

  /**
   * Sets corner and controls position coordinates based on current angle, width and height, left and top.
   *
   * Calling this method is probably redundant, consider calling {@link invalidateCoords} instead.
   */
  setCoords(): void {
    this.bbox = BBox.rotated(this);
    // debug code
    setTimeout(() => {
      const canvas = this.canvas;
      if (!canvas) return;
      const ctx = canvas.contextTop;
      canvas.clearContext(ctx);
      ctx.save();
      const draw = (point: Point, color: string, radius = 6) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(point.x, point.y, radius, radius, 0, 0, 360);
        ctx.closePath();
        ctx.fill();
      };
      [
        new Point(-0.5, -0.5),
        new Point(0.5, -0.5),
        new Point(-0.5, 0.5),
        new Point(0.5, 0.5),
      ].forEach((origin) => {
        draw(BBox.canvas(this).pointFromOrigin(origin), 'yellow', 10);
        draw(BBox.rotated(this).pointFromOrigin(origin), 'orange', 8);
        draw(BBox.transformed(this).pointFromOrigin(origin), 'silver', 6);
        ctx.save();
        ctx.transform(...this.getViewportTransform());
        draw(
          BBox.canvas(this).sendToCanvas().pointFromOrigin(origin),
          'red',
          10
        );
        draw(
          BBox.rotated(this).sendToCanvas().pointFromOrigin(origin),
          'magenta',
          8
        );
        draw(
          BBox.transformed(this).sendToCanvas().pointFromOrigin(origin),
          'blue',
          6
        );
        ctx.restore();
      });
      ctx.restore();
    }, 50);
  }

  invalidateCoords() {
    // delete this.bbox;
  }

  /**
   * @return {Point[]} [tl, tr, br, bl] in the scene plane
   * @returns {number} x position according to object's {@link originX} property in canvas coordinate plane
   */
  getX(originX: TOriginX = this.originX): number {
    return this.getXY(originX).x;
  }

  /**
   * @param {number} value x position according to object's {@link originX} property in canvas coordinate plane
   */
  setX(value: number, originX: TOriginX = this.originX) {
    this.setXY(this.getXY(originX).setX(value));
  }

  /**
   * @returns {number} y position according to object's {@link originY} property in canvas coordinate plane
   */
  getY(originY: TOriginY = this.originY): number {
    return this.getXY(undefined, originY).y;
  }

  /**
   * @param {number} value y position according to object's {@link originY} property in canvas coordinate plane
   */
  setY(value: number, originY: TOriginY = this.originY) {
    this.setXY(this.getXY(undefined, originY).setY(value));
  }

  /**
   * @returns {Point} x position according to object's {@link originX} {@link originY} properties in canvas coordinate plane
   */
  getXY(
    originX: TOriginX = this.originX,
    originY: TOriginY = this.originY
  ): Point {
    return this.bbox.pointFromOrigin(
      resolveOriginPoint({ x: originX, y: originY })
    );
  }

  /**
   * Set an object position to a particular point, the point is intended in absolute ( canvas ) coordinate.
   * You can specify {@link originX} and {@link originY} values,
   * that otherwise are the object's current values.
   * @example <caption>Set object's bottom left corner to point (5,5) on canvas</caption>
   * object.setXY(new Point(5, 5), 'left', 'bottom').
   * @param {Point} point position in canvas coordinate plane
   * @param {TOriginX} [originX] Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginY} [originY] Vertical origin: 'top', 'center' or 'bottom'
   */
  setXY(
    point: Point,
    originX: TOriginX = 'center',
    originY: TOriginY = 'center'
  ) {
    const delta = this.bbox.getOriginTranslationInParent(
      point,
      resolveOriginPoint({ x: originX, y: originY })
    );
    this.set({
      left: this.left + delta.x,
      top: this.top + delta.y,
    });
    this.setCoords();
  }

  /**
   * Checks if object intersects with an area formed by 2 points
   * @param {Object} pointTL top-left point of area
   * @param {Object} pointBR bottom-right point of area
   * @param {Boolean} [absolute] use coordinates without viewportTransform
   * @param {Boolean} [calculate] use coordinates of current position instead of stored one
   * @return {Boolean} true if object intersects with an area formed by 2 points
   */
  getCoords(): Point[] {
    return (this.bbox || (this.bbox = BBox.rotated(this))).getCoords();
  }

  /**
   * Checks if object intersects with the scene rect formed by {@link tl} and {@link br}
   */
  intersectsWithRect(tl: Point, br: Point): boolean {
    const intersection = Intersection.intersectPolygonRectangle(
      this.getCoords(),
      tl,
      br
    );
    return intersection.status === 'Intersection';
  }

  /**
   * Checks if object intersects with another object
   * @param {Object} other Object to test
   * @return {Boolean} true if object intersects with another object
   */
  intersectsWithObject(other: ObjectGeometry): boolean {
    const intersection = Intersection.intersectPolygonPolygon(
      this.getCoords(),
      other.getCoords()
    );
    return (
      intersection.status === 'Intersection' ||
      intersection.status === 'Coincident' ||
      other.isContainedWithinObject(this) ||
      this.isContainedWithinObject(other)
    );
  }

  /**
   * Checks if object is fully contained within area of another object
   * @param {Object} other Object to test
   * @return {Boolean} true if object is fully contained within area of another object
   */
  isContainedWithinObject(other: ObjectGeometry): boolean {
    const points = this.getCoords();
    return points.every((point) => other.containsPoint(point));
  }

  /**
   * Checks if object is fully contained within the scene rect formed by {@link tl} and {@link br}
   */
  isContainedWithinRect(tl: Point, br: Point): boolean {
    const { left, top, width, height } = this.getBoundingRect();
    return (
      left >= tl.x &&
      left + width <= br.x &&
      top >= tl.y &&
      top + height <= br.y
    );
  }

  isOverlapping<T extends ObjectGeometry>(other: T): boolean {
    return (
      this.intersectsWithObject(other) ||
      this.isContainedWithinObject(other) ||
      other.isContainedWithinObject(this)
    );
  }

  /**
   * Checks if point is inside the object
   * @param {Point} point Point to check against
   * @return {Boolean} true if point is inside the object
   */
  containsPoint(point: Point): boolean {
    return Intersection.isPointInPolygon(point, this.getCoords());
  }

  /**
   * Checks if object is contained within the canvas with current viewportTransform
   * the check is done stopping at first point that appears on screen
   * @return {Boolean} true if object is fully or partially contained within canvas
   */
  isOnScreen(): boolean | undefined {
    return this.canvas && CanvasBBox.bbox(this.canvas).overlaps(this.bbox);
  }

  /**
   * Checks if object is partially contained within the canvas with current viewportTransform
   * @return {Boolean} true if object is partially contained within canvas
   */
  isPartiallyOnScreen(): boolean | undefined {
    if (!this.canvas) {
      return undefined;
    }
    const bbox = CanvasBBox.bbox(this.canvas);
    return bbox.intersects(this.bbox) || bbox.isContainedBy(this.bbox);
  }

  /**
   * Returns coordinates of object's bounding rectangle (left, top, width, height)
   * the box is intended as aligned to axis of canvas.
   * @return {Object} Object with left, top, width, height properties
   */
  getBoundingRect(): TBBox {
    // return BBox.canvas(this).getBBox()
    return makeBoundingBoxFromPoints(this.getCoords());
  }

  /**
   * Returns width of an object's bounding box counting transformations
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @return {Number} width value
   */
  getScaledWidth(): number {
    return BBox.transformed(this).sendToCanvas().getDimensionsVector().x;
  }

  /**
   * Returns height of an object bounding box counting transformations
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @return {Number} height value
   */
  getScaledHeight(): number {
    return BBox.transformed(this).sendToCanvas().getDimensionsVector().y;
  }

  /**
   * Scales an object (equally by x and y)
   * @param {Number} value Scale factor
   * @return {void}
   */
  scale(value: number): void {
    this._set('scaleX', value);
    this._set('scaleY', value);
    this.invalidateCoords();
  }

  /**
   * @param {TDegree} angle Angle value (in degrees)
   * @deprecated avoid decomposition
   * @returns own decomposed angle
   */
  rotate(angle: TDegree) {
    const origin = this.centeredRotation ? this.getCenterPoint() : this.getXY();
    const t = multiplyTransformMatrixArray([
      this.group && invertTransform(this.group.calcTransformMatrix()),
      createRotateMatrix({
        angle: angle - calcPlaneRotation(this.calcTransformMatrix()),
      }),
      this.calcTransformMatrix(),
    ]);
    const { angle: decomposedAngle } = qrDecompose(t);
    this.set({ angle: decomposedAngle });
    this.centeredRotation ? this.setCenterPoint(origin) : this.setXY(origin);
    this.setCoords();
    return decomposedAngle;
  }

  scaleAxisTo(axis: TAxis, value: number, inViewport: boolean) {
    // adjust to bounding rect factor so that rotated shapes would fit as well
    const transformed = BBox.transformed(this)
      .sendToCanvas()
      .getDimensionsVector();
    const rotated = (this.bbox || (this.bbox = BBox.rotated(this)))
      .sendToCanvas()
      .getDimensionsVector();
    const boundingRectFactor = rotated[axis] / transformed[axis];
    this.scale(
      value / new Point(this.width, this.height)[axis] / boundingRectFactor
    );
  }
}
