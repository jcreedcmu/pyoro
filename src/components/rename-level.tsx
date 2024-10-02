import * as React from 'react';
import { RenameLevelProps } from '../core/rename-level';

export function RenameLevel(props: RenameLevelProps): JSX.Element {
  const [src, setSrc] = React.useState(props.data.src);
  const [dst, setDst] = React.useState(props.data.src);
  const { dispatch } = props;

  const dismiss: React.MouseEventHandler = (_e) => {
    dispatch({ t: 'cancelModals' });
  };

  const accept: React.MouseEventHandler = (_e) => {
    dispatch({ t: 'doRename', src, dst });
  };

  const absorb: React.MouseEventHandler = (e) => {
    e.stopPropagation();
  };

  // XXX factor common code out that this shares with renderLevelPicker?
  const options = props.levels.sort().map(level => {
    return <option value={level}>{level}</option>;
  });

  const onChange: React.ChangeEventHandler<HTMLSelectElement> = e => {
    setSrc(e.currentTarget.value);
  };

  const errorMsg = src != dst && props.levels.includes(dst) ? 'level already exists!' : undefined;
  const inputFieldStyle: React.CSSProperties = errorMsg != undefined ? { color: 'red' } : {};
  const errorStyle: React.CSSProperties = {
    color: 'red',
    paddingTop: 10,
    visibility: errorMsg != undefined ? undefined : 'hidden',
  };
  const sourceLevelSelect = <select value={src}
    onChange={onChange}
  >{options}</select>
  return <div className="rename-level-container" onMouseDown={dismiss}>
    <div className="rename-level-modal" onContextMenu={absorb} onMouseDown={absorb}>
      <center>
        Rename {sourceLevelSelect} to <input style={inputFieldStyle} value={dst} onChange={e => { setDst(e.currentTarget.value) }} /><br />
        <div style={errorStyle}>{errorMsg ?? '.'}</div>
        <button style={{ marginRight: '1em', marginTop: '2em' }} onClick={dismiss}>Cancel</button>
        <button disabled={errorMsg != undefined} style={{ marginTop: '2em' }} onClick={accept}>Ok</button>
      </center>
    </div>
  </div>;
}
