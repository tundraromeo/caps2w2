"use client";

import { ToastContainer } from 'react-toastify';

export default function ClientToastContainer() {
  return (
    <ToastContainer 
      position="top-right" 
      autoClose={2000} 
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick={false}
      rtl={false}
      pauseOnFocusLoss={false}
      draggable={false}
      pauseOnHover={false}
      theme="light"
    />
  );
}
