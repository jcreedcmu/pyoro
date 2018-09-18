export type Dict<T> = { [k: string]: T };
export type Point = { x: number, y: number };
export type Rect = { p: Point, w: number, h: number };
export type Ctx = CanvasRenderingContext2D;
export type Tile = 'box' | 'box3' | 'fragile_box' | 'empty' | 'broken_box';
export type Move = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'reset';
