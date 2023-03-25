import type { XY } from '../../Point';
import { Point } from '../../Point';
import type { TRadian } from '../../typedefs';

const zero = new Point();

/**
 * Rotates `vector` with `radians`
 * @param {Point} vector The vector to rotate (x and y)
 * @param {Number} radians The radians of the angle for the rotation
 * @return {Point} The new rotated point
 */
export const rotateVector = (vector: Point, radians: TRadian) =>
  vector.rotate(radians);

/**
 * Creates a vector from points represented as a point
 *
 * @param {Point} from
 * @param {Point} to
 * @returns {Point} vector
 */
export const createVector = (from: XY, to: XY): Point =>
  new Point(to).subtract(from);

/**
 * return the magnitude of a vector
 * @return {number}
 */
export const magnitude = (point: Point) => point.distanceFrom(zero);

export const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;

export const det = (a: Point, b: Point) => a.x * b.y - a.y * b.x;

/**
 * Calculates the angle between 2 vectors
 * @param {Point} a
 * @param {Point} b
 * @returns the angle in radians from `a` to `b`
 */
export const calcAngleBetweenVectors = (a: Point, b: Point): TRadian => {
  return Math.atan2(det(a, b), dot(a, b)) as TRadian;
};

/**
 * Calculates the angle between the x axis and the vector
 * @param {Point} v
 * @returns the angle in radians of `v`
 */
export const calcVectorRotation = (v: XY) => Math.atan2(v.y, v.x) as TRadian;

/**
 * @param {Point} v
 * @returns {Point} vector representing the unit vector pointing to the direction of `v`
 */
export const getUnitVector = (v: Point): Point =>
  v.eq(zero) ? v : v.scalarDivide(magnitude(v));

export const dotProduct = (v: Point, onto: Point) => {
  const size = magnitude(v);
  const baseSize = magnitude(onto);
  return size && baseSize ? dot(v, onto) / baseSize : 0;
};

/**
 * @param {Point} A
 * @param {Point} B
 * @param {Point} C
 * @returns {{ vector: Point, angle: TRadian}} vector representing the bisector of A and A's angle
 */
export const getBisector = (A: Point, B: Point, C: Point) => {
  const AB = createVector(A, B),
    AC = createVector(A, C),
    alpha = calcAngleBetweenVectors(AB, AC);
  return {
    vector: getUnitVector(rotateVector(AB, alpha / 2)),
    angle: alpha,
  };
};

/**
 * @param {Point} v
 * @param {Boolean} [counterClockwise] the direction of the orthogonal vector, defaults to `true`
 * @returns {Point} the unit orthogonal vector
 */
export const getOrthogonalVector = (v: Point, counterClockwise = true): Point =>
  new Point(-v.y, v.x).scalarMultiply(counterClockwise ? 1 : -1);

/**
 * @param {Point} v
 * @param {Boolean} [counterClockwise] the direction of the orthogonal vector, defaults to `true`
 * @returns {Point} the unit orthogonal vector
 */
export const getOrthonormalVector = (
  v: Point,
  counterClockwise = true
): Point => getUnitVector(getOrthogonalVector(v, counterClockwise));

/**
 * Checks if the vector is between two others. It is considered
 * to be inside when the vector to be tested is between the
 * initial vector and the final vector (included) in a counterclockwise direction.
 * @param {Point} t vector to be tested
 * @param {Point} a initial vector
 * @param {Point} b final vector
 * @returns {boolean} true if the vector is among the others
 */
export const isBetweenVectors = (t: Point, a: Point, b: Point): boolean => {
  if (t.eq(a) || t.eq(b)) return true;
  const AxB = det(a, b),
    AxT = det(a, t),
    BxT = det(b, t);
  return AxB >= 0 ? AxT >= 0 && BxT <= 0 : !(AxT <= 0 && BxT >= 0);
};
