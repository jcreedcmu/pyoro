interface ObjectConstructor {
  entries<T, U extends string>(o: { [s in U]: T }): [U, T][];
}
