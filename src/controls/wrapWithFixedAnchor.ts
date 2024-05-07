import type { Transform, TransformActionHandler } from '../EventTypeDefs';

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
    const { target, originX, originY } = transform,
      constraint = target.getXY(originX, originY),
      actionPerformed = actionHandler(eventData, transform, x, y);
    target.setXY(constraint, originX, originY);
    return actionPerformed;
  }) as TransformActionHandler<T>;
}
