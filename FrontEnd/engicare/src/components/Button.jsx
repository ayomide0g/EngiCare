import React from "react";

const Button = ({ 
  children, 
  variant = "primary", 
  size = "md", 
  isLoading = false, 
  disabled = false, 
  type = "button", 
  onClick, 
  className = "",
  icon: Icon
}) => {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <span className="spinner"></span>
      ) : (
        <>
          {Icon && <Icon size={18} className="btn-icon" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default Button;