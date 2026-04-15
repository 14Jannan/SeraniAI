import React from "react";

function SeraniAILogo({ size = 40, className = "", color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SeraniAI Logo"
    >
      {/* Background Circle */}
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        stroke={color} 
        strokeWidth="2" 
        className="opacity-20"
      />
      
      {/* Simplified S Path */}
      <path
        d="M8 15.5C8 15.5 9 17 12 17C15 17 16 15.5 16 14C16 12.5 15 11.5 12 11C9 10.5 8 9.5 8 8C8 6.5 9 5 12 5C15 5 16 6.5 16 6.5"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Subtle AI Sparkle/Dot */}
      <circle cx="16" cy="17" r="1.5" fill={color} />
    </svg>
  );
}

export default SeraniAILogo;
