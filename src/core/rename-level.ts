import { Dispatch } from '../action';

export type RenameLevelData = {
  src: string,
};

export type RenameLevelProps = {
  levels: string[],
  dispatch: Dispatch,
  data: RenameLevelData,
};
