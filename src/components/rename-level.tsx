import * as React from 'react';
import { RenameLevelProps } from '../core/rename-level';

export function RenameLevel(props: RenameLevelProps): JSX.Element {
  const { dispatch } = props;

  const dismiss: React.MouseEventHandler = (_e) => {
    dispatch({ t: 'cancelModals' });
  };

  const absorb: React.MouseEventHandler = (e) => {
    e.stopPropagation();
  };

  return <div className="rename-level-container" onMouseDown={dismiss}>
    <div className="rename-level-modal" onContextMenu={absorb} onMouseDown={absorb}>
      <center>
        <button style={{ marginTop: '2em' }} onClick={dismiss}>Ok</button>
      </center>
    </div>
  </div>;
}
