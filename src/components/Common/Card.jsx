import React from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`glass-card rounded-2xl p-6 sm:p-8 transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
