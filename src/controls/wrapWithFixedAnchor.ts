import type { Transform, TransformActionHandler } from '../EventTypeDefs';
import { Point } from '../Point';
import { resolveOrigin } from '../util/misc/resolveOrigin';

/**
 * Wrap an action handler with saving/restoring object position on the transform.
 * this is the code that permits to objects to keep their position while transforming.
 * @param {Function} actionHandler the function to wrap
 * @return {Function} a function with an action handler signature
 */
export function wrapWithFixedAnchor<T extends Transform>(
  actionHandler: TransformActionHandler<T>
) {
  return ((eventData, transform, x, y) => {
    const { target, originX, originY } = transform;
    const origin = new Point(resolveOrigin(originX), resolveOrigin(originY));
    const constraint = target.bbox.pointFromOrigin(origin),
      actionPerformed = actionHandler(eventData, transform, x, y),
      delta = target.bbox.pointFromOrigin(origin).subtract(constraint),
      originDiff = target.bbox.sendToParent().vectorToOrigin(delta);
    // @TODO revisit to use setRelativeCenterPoint
    target.set({ left: target.left + delta.x, top: target.top + delta.y });
    return actionPerformed;
  }) as TransformActionHandler<T>;
}
