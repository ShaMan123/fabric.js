import { BBox } from '../../BBox/BBox';
import { ObjectEvents } from '../../EventTypeDefs';
import { Point } from '../../Point';
import type { TAxis, TDegree } from '../../typedefs';
import { radiansToDegrees } from '../../util';
import {
  calcPlaneRotation,
  createRotateMatrix,
  invertTransform,
  multiplyTransformMatrixArray,
} from '../../util/misc/matrix';
import { ObjectPosition } from './ObjectPosition';

export class ObjectTransformations<
  EventSpec extends ObjectEvents = ObjectEvents
> extends ObjectPosition<EventSpec> {
  /**
   * Returns width of an object's bounding box counting transformations
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @return {Number} width value
   * @deprecated avoid decomposition, use {@link ObjectTransformations} instead
   */
  getScaledWidth(): number {
    return BBox.transformed(this).sendToCanvas().getDimensionsVector().x;
  }

  /**
   * Returns height of an object bounding box counting transformations
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @return {Number} height value
   * @deprecated avoid decomposition, use {@link ObjectTransformations} instead
   */
  getScaledHeight(): number {
    return BBox.transformed(this).sendToCanvas().getDimensionsVector().y;
  }

  /**
   * Scales an object (equally by x and y)
   * @param {Number} value Scale factor
   * @return {void}
   * @deprecated avoid decomposition, use {@link ObjectTransformations} instead
   */
  scale(value: number): void {
    this._set('scaleX', value);
    this._set('scaleY', value);
    this.setCoords();
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
    this.scale(
      value / new Point(this.width, this.height)[axis] / boundingRectFactor
    );
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
   * @param {TDegree} angle Angle value (in degrees)
   * @returns own decomposed angle
   * @deprecated avoid decomposition, use {@link ObjectTransformations} instead
   */
  rotate(angle: TDegree) {
    const origin = this.centeredRotation ? this.getCenterPoint() : this.getXY();
    const m = this.calcTransformMatrix();
    const t = multiplyTransformMatrixArray([
      this.group && invertTransform(this.group.calcTransformMatrix()),
      createRotateMatrix({ angle: angle - calcPlaneRotation(m) }),
      m,
    ]);
    const ownAngle = radiansToDegrees(calcPlaneRotation(t));
    this.set({ angle: ownAngle });
    this.centeredRotation ? this.setCenterPoint(origin) : this.setXY(origin);
    this.setCoords();
    return ownAngle;
  }
}
