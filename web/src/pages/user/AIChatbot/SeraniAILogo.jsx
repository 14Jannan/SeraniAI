import React from "react";

function SeraniAILogo({ size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SeraniAI Logo"
    >
      <path
        fill="currentColor"
        d="M128 24C70.6 24 24 70.6 24 128s46.6 104 104 104 104-46.6 104-104S185.4 24 128 24Zm56.7 86.2c2.4 8.5 2.4 17.5 0 26l-18.6-10.7a37.4 37.4 0 0 0 0-4.6 37.4 37.4 0 0 0-18.7-32.3l10.7-18.6c11.8 6.9 20.4 18 24.6 31.2Zm-56.7-43.3c8.5 0 17.5 2.3 26 6.6l-10.7 18.6a37.4 37.4 0 0 0-32.3 0L100.3 73.5a61.3 61.3 0 0 1 27.7-6.6Zm-43.3 56.7c0-8.5 2.3-17.5 6.6-26l18.6 10.7a37.4 37.4 0 0 0 0 32.3l-18.6 10.7a61.3 61.3 0 0 1-6.6-27.7Zm43.3 56.7c-8.5 0-17.5-2.3-26-6.6l10.7-18.6a37.4 37.4 0 0 0 32.3 0l10.7 18.6a61.3 61.3 0 0 1-27.7 6.6Zm43.3-56.7c0 8.5-2.3 17.5-6.6 26l-18.6-10.7a37.4 37.4 0 0 0 0-32.3l18.6-10.7a61.3 61.3 0 0 1 6.6 27.7Z"
      />
    </svg>
    // <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
    //   <h1>S</h1>
    // </div>
      

  );
}

export default SeraniAILogo;
