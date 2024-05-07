import { iMatrix } from '../constants';
import type { ObjectBBox } from '../shapes/Object/ObjectBBox';
import type { TMat2D } from '../typedefs';
import { mapValues } from '../util/internals';
import { multiplyTransformMatrices } from '../util/misc/matrix';
import { sendPointToPlane } from '../util/misc/planeChange';
import type { BBoxPlanes } from './BBox';
import { BBox } from './BBox';

/**
 * Performance optimization
 */
export class OwnBBox extends BBox {
  constructor(transform: TMat2D, planes: BBoxPlanes) {
    super(transform, planes);
  }

  getCoords() {
    const from = multiplyTransformMatrices(
      this.planes.viewport(),
      this.planes.self()
    );
    return mapValues(super.getCoords(), (coord) =>
      sendPointToPlane(coord, from)
    );
  }

  static getPlanes(target: ObjectBBox): BBoxPlanes {
    return {
      self() {
        return target.calcTransformMatrix();
      },
      parent() {
        return target.group?.calcTransformMatrix() || iMatrix;
      },
      viewport() {
        return target.getViewportTransform();
      },
    };
  }
}
