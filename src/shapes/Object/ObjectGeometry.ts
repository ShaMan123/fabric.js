import { ObjectEvents } from '../../EventTypeDefs';
import { Point } from '../../Point';
import type { TBBox } from '../../typedefs';
import { makeBoundingBoxFromPoints } from '../../util/misc/boundingBoxFromPoints';
import { ObjectTransformations } from './ObjectTransformations';
import { ViewportBBox } from '../../BBox/ViewportBBox';
import { Intersection } from '../../Intersection';
import type { Shadow } from '../../Shadow';

export class ObjectGeometry<
  EventSpec extends ObjectEvents = ObjectEvents
> extends ObjectTransformations<EventSpec> {
  declare shadow?: Shadow;

  // @TODO: shadow geometry
  // getShadowData() {
  //   if (!this.shadow) {
  //     return;
  //   }

  //   const {offsetX,offsetY,blur,nonScaling} = this.shadow;
  //   var  sx = 1,
  //     sy = 1;
  //   if (!nonScaling) {
  //     var scaling = this.getTotalObjectScaling();
  //     sx = scaling.x;
  //     sy = scaling.y;
  //   }
  //   const shadowOffset = new Point(
  //       this.shadow.offsetX * sx,
  //       this.shadow.offsetY * sy
  //     ),
  //     blurOffset = new Point(blur * sx, blur * sy);
  //   return {
  //     offset: shadowOffset,
  //     blur: blurOffset,
  //   };
  // }

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
    // const intersection = Intersection.intersectPolygonPolygon(
    //   this.getCoords(),
    //   other.getCoords()
    // );
    // return (
    //   intersection.status === 'Intersection' ||
    //   intersection.status === 'Coincident' ||
    //   other.isContainedWithinObject(this) ||
    //   this.isContainedWithinObject(other)
    // );

    return this.bbox.intersects(other.bbox);
  }

  /**
   * Checks if object is fully contained within area of another object
   * @param {Object} other Object to test
   * @return {Boolean} true if object is fully contained within area of another object
   */
  isContainedWithinObject(other: ObjectGeometry): boolean {
    // const points = this.getCoords();
    // return points.every((point) => other.containsPoint(point));
    return this.bbox.isContainedBy(other.bbox);
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
    return this.bbox.overlaps(other.bbox);
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
   * @deprecated move to canvas
   */
  isOnScreen(): boolean {
    if (!this.canvas) {
      return false;
    }
    return ViewportBBox.canvas(this.canvas).overlaps(this.bbox);
  }

  /**
   * Checks if object is partially contained within the canvas with current viewportTransform
   * @return {Boolean} true if object is partially contained within canvas
   * @deprecated move to canvas
   */
  isPartiallyOnScreen(): boolean | undefined {
    if (!this.canvas) {
      return undefined;
    }
    const bbox = ViewportBBox.canvas(this.canvas);
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
}
