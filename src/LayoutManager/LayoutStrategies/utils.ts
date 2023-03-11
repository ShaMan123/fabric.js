import { Point } from '../../Point';
import type { Group } from '../../shapes/Group';
import type { FabricObject } from '../../shapes/Object/FabricObject';
import { calcPlaneChangeMatrix } from '../../util/misc/planeChange';

/**
 * @returns 2 points, the tl and br corners of the non rotated bounding box of an object
 * in the {@link group} plane, taking into account objects that {@link group} is their parent
 * but also belong to the active selection.
 * @TODO revisit as part of redoing coords
 */
export const getObjectBounds = (
  destinationGroup: Group,
  object: FabricObject
): Point[] => {
  const {
    strokeUniform,
    strokeWidth,
    width,
    height,
    group: currentGroup,
  } = object;
  const t =
    currentGroup && currentGroup !== destinationGroup
      ? calcPlaneChangeMatrix(
          currentGroup.calcTransformMatrix(),
          destinationGroup.calcTransformMatrix()
        )
      : null;
  const objectCenter = t
    ? object.getRelativeCenterPoint()
    : object.getRelativeCenterPoint();
  const sizeVector = object.bbox
    .sendToParent()
    .getDimensionsVector()
    .scalarDivide(2);

  const a = objectCenter.subtract(sizeVector);
  const b = objectCenter.add(sizeVector);
  return t ? [a.transform(t), b.transform(t)] : [a, b];
};
