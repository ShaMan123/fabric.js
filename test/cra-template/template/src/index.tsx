import React from 'react';
import ReactDOM from 'react-dom';
import Canvas from './App';
import reportWebVitals from './reportWebVitals';
import SandboxUI from './SandboxUI';
import './styles.css';

function App() {
  return (
    <SandboxUI>
      <div className="App-canvas">
        <Canvas />
      </div>
    </SandboxUI>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
