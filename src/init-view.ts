import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { App } from './app';

/**
 * Initializes the react renderer
 */
export function initView() {
  const root = ReactDOM.createRoot(document.getElementById('render-root')!);
  root.render(React.createElement(App, {}));
}
