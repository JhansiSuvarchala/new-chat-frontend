import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';  // <-- import BrowserRouter
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter basename="/new-chat-frontend">  {/* <-- set basename to your repo name */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
