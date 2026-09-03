import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RosProvider } from './services/ros';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RosProvider>
      <App />
    </RosProvider>
  </React.StrictMode>,
);
