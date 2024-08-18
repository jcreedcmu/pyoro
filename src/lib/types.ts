import { Point } from "./point";

/** A string-keyed dictionary whose values are `T` */
export type Dict<T> = { [k: string]: T };

/** A color in the RGB colorspace, where the components are in [0,255]. */
export type Color = { r: number, g: number, b: number };

/** A rectangle given by its offset and size. */
export type Rect = { p: Point, sz: Point };

/** A rectangle given by its min and max. */
export type Brect = { min: Point, max: Point };
