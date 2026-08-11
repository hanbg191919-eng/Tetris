import React from 'react';
import ReactDOM from 'react-dom/client';
import './font-awesome.css';
import App from './App.jsx';
import './styles.css';

// index.html의 #root 하나에 React 애플리케이션 전체를 연결한다.
// StrictMode는 개발 중 잘못된 부수 효과를 더 빨리 발견하도록 돕는다.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
);
