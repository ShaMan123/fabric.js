import type {
  TAxis,
  TBBox,
  TCornerPoint,
  TDegree,
  TMat2D,
  TOriginX,
  TOriginY,
} from '../../typedefs';
import { iMatrix } from '../../constants';
import { Intersection } from '../../Intersection';
import { Point } from '../../Point';
import {
  composeMatrix,
  invertTransform,
  multiplyTransformMatrices,
  transformPoint,
  calcPlaneRotation,
} from '../../util/misc/matrix';
import { radiansToDegrees } from '../../util/misc/radiansDegreesConversion';
import type { Canvas } from '../../canvas/Canvas';
import type { StaticCanvas } from '../../canvas/StaticCanvas';
import { ObjectOrigin } from './ObjectOrigin';
import type { ObjectEvents } from '../../EventTypeDefs';
import type { ControlProps } from './types/ControlProps';
import { mapValues } from '../../util/internals';
import { getUnitVector, rotateVector } from '../../util/misc/vectors';
import { sendVectorToPlane } from '../../util/misc/planeChange';
import { BBox } from './BBox';
import { makeBoundingBoxFromPoints } from '../../util/misc/boundingBoxFromPoints';

type TMatrixCache = {
  key: string;
  value: TMat2D;
};

export class ObjectGeometry<EventSpec extends ObjectEvents = ObjectEvents>
  extends ObjectOrigin<EventSpec>
  implements Pick<ControlProps, 'padding'>
{
  declare padding: number;

  declare bboxCoords?: TCornerPoint;
  declare bbox?: BBox;

  /**
   * storage cache for object transform matrix
   */
  declare ownMatrixCache?: TMatrixCache;

  /**
   * storage cache for object full transform matrix
   */
  declare matrixCache?: TMatrixCache;

  /**
   * A Reference of the Canvas where the object is actually added
   * @type StaticCanvas | Canvas;
   * @default undefined
   * @private
   */
  declare canvas?: StaticCanvas | Canvas;

  /**
   * @returns {number} x position according to object's {@link originX} property in canvas coordinate plane
   */
  getX(): number {
    return this.getXY().x;
  }

  /**
   * @param {number} value x position according to object's {@link originX} property in canvas coordinate plane
   */
  setX(value: number) {
    this.setXY(this.getXY().setX(value));
  }

  /**
   * @returns {number} y position according to object's {@link originY} property in canvas coordinate plane
   */
  getY(): number {
    return this.getXY().y;
  }

  /**
   * @param {number} value y position according to object's {@link originY} property in canvas coordinate plane
   */
  setY(value: number) {
    this.setXY(this.getXY().setY(value));
  }

  /**
   * @returns {number} x position according to object's {@link originX} property in parent's coordinate plane\
   * if parent is canvas then this property is identical to {@link getX}
   */
  getRelativeX(): number {
    return this.left;
  }

  /**
   * @param {number} value x position according to object's {@link originX} property in parent's coordinate plane\
   * if parent is canvas then this method is identical to {@link setX}
   */
  setRelativeX(value: number) {
    this.left = value;
  }

  /**
   * @returns {number} y position according to object's {@link originY} property in parent's coordinate plane\
   * if parent is canvas then this property is identical to {@link getY}
   */
  getRelativeY(): number {
    return this.top;
  }

  /**
   * @param {number} value y position according to object's {@link originY} property in parent's coordinate plane\
   * if parent is canvas then this property is identical to {@link setY}
   */
  setRelativeY(value: number) {
    this.top = value;
  }

  /**
   * @returns {Point} x position according to object's {@link originX} {@link originY} properties in canvas coordinate plane
   */
  getXY(): Point {
    const relativePosition = this.getRelativeXY();
    return this.group
      ? transformPoint(relativePosition, this.group.calcTransformMatrix())
      : relativePosition;
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
  setXY(point: Point, originX?: TOriginX, originY?: TOriginY) {
    if (this.group) {
      point = transformPoint(
        point,
        invertTransform(this.group.calcTransformMatrix())
      );
    }
    this.setRelativeXY(point, originX, originY);
  }

  /**
   * @returns {Point} x,y position according to object's {@link originX} {@link originY} properties in parent's coordinate plane
   */
  getRelativeXY(): Point {
    return new Point(this.left, this.top);
  }

  /**
   * As {@link setXY}, but in current parent's coordinate plane (the current group if any or the canvas)
   * @param {Point} point position according to object's {@link originX} {@link originY} properties in parent's coordinate plane
   * @param {TOriginX} [originX] Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginY} [originY] Vertical origin: 'top', 'center' or 'bottom'
   */
  setRelativeXY(
    point: Point,
    originX: TOriginX = this.originX,
    originY: TOriginY = this.originY
  ) {
    this.setPositionByOrigin(point, originX, originY);
  }

  /**
   * @deprecated intermidiate method to be removed, do not use
   */
  protected isStrokeAccountedForInDimensions() {
    return false;
  }

  /**
   * @return {Point[]} [tl, tr, br, bl] in the scene plane
   */
  getCoords(): Point[] {
    return (this.bbox || (this.bbox = BBox.rotated(this))).getCoords(false);
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
  isOnScreen(): boolean {
    if (!this.canvas) {
      return false;
    }
    const { tl, br } = this.canvas.vptCoords;
    const points = this.getCoords();
    // if some point is on screen, the object is on screen.
    if (
      points.some(
        (point) =>
          point.x <= br.x &&
          point.x >= tl.x &&
          point.y <= br.y &&
          point.y >= tl.y
      )
    ) {
      return true;
    }
    // no points on screen, check intersection with absolute coordinates
    if (this.intersectsWithRect(tl, br)) {
      return true;
    }
    // check if the object is so big that it contains the entire viewport
    return this.containsPoint(tl.midPointFrom(br));
  }

  /**
   * Checks if object is partially contained within the canvas with current viewportTransform
   * @return {Boolean} true if object is partially contained within canvas
   */
  isPartiallyOnScreen(): boolean {
    if (!this.canvas) {
      return false;
    }
    const { tl, br } = this.canvas.vptCoords;
    if (this.intersectsWithRect(tl, br)) {
      return true;
    }
    const allPointsAreOutside = this.getCoords().every(
      (point) =>
        (point.x >= br.x || point.x <= tl.x) &&
        (point.y >= br.y || point.y <= tl.y)
    );
    // check if the object is so big that it contains the entire viewport
    return allPointsAreOutside && this.containsPoint(tl.midPointFrom(br));
  }

  /**
   * Returns coordinates of object's bounding rectangle (left, top, width, height)
   * the box is intended as aligned to axis of canvas.
   * @return {Object} Object with left, top, width, height properties
   */
  getBoundingRect(): TBBox {
    return makeBoundingBoxFromPoints(this.getCoords());
  }

  /**
   * Returns width of an object's bounding box counting transformations
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @return {Number} width value
   */
  getScaledWidth(): number {
    return BBox.transformed(this).getDimensionsVector(false).x;
  }

  /**
   * Returns height of an object bounding box counting transformations
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @return {Number} height value
   */
  getScaledHeight(): number {
    return BBox.transformed(this).getDimensionsVector(false).y;
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

  scaleAxisTo(axis: TAxis, value: number, inViewport: boolean) {
    // adjust to bounding rect factor so that rotated shapes would fit as well
    const transformed = BBox.transformed(this).getDimensionsVector(false);
    const rotated = (
      this.bbox || (this.bbox = BBox.rotated(this))
    ).getDimensionsVector(inViewport);
    const boundingRectFactor = rotated[axis] / transformed[axis];
    this.scale(value / this.width / boundingRectFactor);
  }

  getCanvasRetinaScaling() {
    return this.canvas?.getRetinaScaling() || 1;
  }

  /**
   * Returns the object angle relative to canvas counting also the group property
   * @returns {TDegree}
   */
  getTotalAngle(): TDegree {
    return this.group
      ? radiansToDegrees(calcPlaneRotation(this.calcTransformMatrix()))
      : this.angle;
  }

  /**
   * Retrieves viewportTransform from Object's canvas if available
   * @return {TMat2D}
   */
  getViewportTransform(): TMat2D {
    return this.canvas?.viewportTransform || (iMatrix.concat() as TMat2D);
  }

  needsViewportCoords() {
    return this.strokeUniform || !this.padding;
  }

  protected calcDimensionsVector(
    origin = new Point(1, 1),
    // @TODO pass t instead
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
        applyViewportTransform
          ? multiplyTransformMatrices(
              this.getViewportTransform(),
              this.calcTransformMatrix()
            )
          : this.calcTransformMatrix(),
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
    const vpt = applyViewportTransform && this.getViewportTransform();
    const t = vpt
      ? multiplyTransformMatrices(vpt, this.calcTransformMatrix())
      : this.calcTransformMatrix();
    const offsetVector = rotateVector(
      offset.add(origin.scalarMultiply(padding * 2)),
      calcPlaneRotation(t)
    );
    const realCenter = vpt
      ? this.getCenterPoint().transform(vpt)
      : this.getCenterPoint();
    return realCenter
      .add(this.calcDimensionsVector(origin, { applyViewportTransform }))
      .add(offsetVector);
  }

  /**
   * Calculates the coordinates of the 4 corner of the bbox
   * @return {TCornerPoint}
   */
  calcCoords(): TCornerPoint {
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
    this.bboxCoords = this.calcCoords();
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
        draw(BBox.canvas(this).applyToPointInViewport(origin), 'red', 10);
        draw(BBox.rotated(this).applyToPointInViewport(origin), 'magenta', 8);
        draw(BBox.transformed(this).applyToPointInViewport(origin), 'blue', 6);
        ctx.transform(...this.getViewportTransform());
        draw(BBox.canvas(this).applyToPointInCanvas(origin), 'red', 10);
        draw(BBox.rotated(this).applyToPointInCanvas(origin), 'magenta', 8);
        draw(BBox.transformed(this).applyToPointInCanvas(origin), 'blue', 6);
      });
      ctx.restore();
    }, 50);
  }

  invalidateCoords() {
    delete this.bboxCoords;
    delete this.bbox;
  }

  transformMatrixKey(skipGroup = false): string {
    const sep = '_';
    let prefix = '';
    if (!skipGroup && this.group) {
      prefix = this.group.transformMatrixKey(skipGroup) + sep;
    }
    return (
      prefix +
      this.top +
      sep +
      this.left +
      sep +
      this.scaleX +
      sep +
      this.scaleY +
      sep +
      this.skewX +
      sep +
      this.skewY +
      sep +
      this.angle +
      sep +
      this.originX +
      sep +
      this.originY +
      sep +
      this.width +
      sep +
      this.height +
      sep +
      this.strokeWidth +
      this.flipX +
      this.flipY
    );
  }

  /**
   * calculate transform matrix that represents the current transformations from the
   * object's properties.
   * @param {Boolean} [skipGroup] return transform matrix for object not counting parent transformations
   * There are some situation in which this is useful to avoid the fake rotation.
   * @return {TMat2D} transform matrix for the object
   */
  calcTransformMatrix(skipGroup = false): TMat2D {
    let matrix = this.calcOwnMatrix();
    if (skipGroup || !this.group) {
      return matrix;
    }
    const key = this.transformMatrixKey(skipGroup),
      cache = this.matrixCache;
    if (cache && cache.key === key) {
      return cache.value;
    }
    if (this.group) {
      matrix = multiplyTransformMatrices(
        this.group.calcTransformMatrix(false),
        matrix
      );
    }
    this.matrixCache = {
      key,
      value: matrix,
    };
    return matrix;
  }

  /**
   * calculate transform matrix that represents the current transformations from the
   * object's properties, this matrix does not include the group transformation
   * @return {TMat2D} transform matrix for the object
   */
  calcOwnMatrix(): TMat2D {
    const key = this.transformMatrixKey(true),
      cache = this.ownMatrixCache;
    if (cache && cache.key === key) {
      return cache.value;
    }
    const center = this.getRelativeCenterPoint(),
      options = {
        angle: this.angle,
        translateX: center.x,
        translateY: center.y,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        skewX: this.skewX,
        skewY: this.skewY,
        flipX: this.flipX,
        flipY: this.flipY,
      },
      value = composeMatrix(options);
    this.ownMatrixCache = {
      key,
      value,
    };
    return value;
  }

  /**
   * Calculate object dimensions from its properties
   * @deprecated
   * @private
   * @returns {Point} dimensions
   */
  _getNonTransformedDimensions(): Point {
    return new Point(this.width, this.height).scalarAdd(this.strokeWidth);
  }

  /**
   * Calculate object bounding box dimensions from its properties scale, skew.
   * @deprecated
   * @param {Object} [options]
   * @param {Number} [options.scaleX]
   * @param {Number} [options.scaleY]
   * @param {Number} [options.skewX]
   * @param {Number} [options.skewY]
   * @private
   * @returns {Point} dimensions
   */
  _getTransformedDimensions1(options: any = {}): Point {
    return sendVectorToPlane(
      this.calcDimensionsVector(/*new Point(options.width||)*/),
      this.group?.calcTransformMatrix(),
      composeMatrix({
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        skewX: this.skewX,
        skewY: this.skewY,
        ...options,
      })
    );
  }

  /**
   * Calculate object dimensions for controls box, including padding and canvas zoom.
   * and active selection
   * @deprecated
   * @private
   * @param {object} [options] transform options
   * @returns {Point} dimensions
   */
  _calculateCurrentDimensions(options?: any): Point {
    return this._getTransformedDimensions(options)
      .transform(this.getViewportTransform(), true)
      .scalarAdd(2 * this.padding);
  }
}
