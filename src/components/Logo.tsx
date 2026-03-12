import React from 'react';

const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };

  return (
    <div className={`font-bold ${sizes[size]} text-skyblue-400 ${className}`}>
      Lightning Line
    </div>
  );
};

export default Logo;

