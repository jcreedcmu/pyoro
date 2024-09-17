import { Dispatch } from '../action';

export type RenameLevelData = {
  src: string,
};

export type RenameLevelProps = {
  dispatch: Dispatch,
  data: RenameLevelData,
};
