import * as React from 'react';
import { RenameLevelProps } from '../core/rename-level';

export function RenameLevel(props: RenameLevelProps): JSX.Element {
  const [dst, setDst] = React.useState(props.data.src);
  const { dispatch } = props;

  const dismiss: React.MouseEventHandler = (_e) => {
    dispatch({ t: 'cancelModals' });
  };

  const accept: React.MouseEventHandler = (_e) => {
    dispatch({ t: 'doRename', src: props.data.src, dst });
  };

  const absorb: React.MouseEventHandler = (e) => {
    e.stopPropagation();
  };

  return <div className="rename-level-container" onMouseDown={dismiss}>
    <div className="rename-level-modal" onContextMenu={absorb} onMouseDown={absorb}>
      <center>
        Rename "{props.data.src}" to <input value={dst} onChange={e => { setDst(e.currentTarget.value) }} /><br />
        <button style={{ marginRight: '1em', marginTop: '2em' }} onClick={dismiss}>Cancel</button>
        <button style={{ marginTop: '2em' }} onClick={accept}>Ok</button>
      </center>
    </div>
  </div>;
}
