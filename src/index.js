import React from 'react';
import ReactDOM from 'react-dom/client';
import CheckpointTreeViewer from './CheckpointTreeViewer.tsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CheckpointTreeViewer />
  </React.StrictMode>
);
