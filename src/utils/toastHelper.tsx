import { toast as toastify, ToastOptions, ToastContent, ToastContentProps } from "react-toastify";
import React from "react";

// Simple custom toast component inline
const CustomToastContent = ({ closeToast, data, type }: { closeToast?: () => void; data?: { title?: string }; type?: string }) => {
  const toastStyles = {
    success: {
      borderColor: "#30DA0E",
      iconColor: "#30DA0E",
      glowColor: "rgba(48, 218, 14, 0.3)",
    },
    error: {
      borderColor: "#FA6A1D",
      iconColor: "#FA6A1D",
      glowColor: "rgba(250, 106, 29, 0.3)",
    },
    warning: {
      borderColor: "#FF9900",
      iconColor: "#FF9900",
      glowColor: "rgba(255, 153, 0, 0.3)",
    },
    info: {
      borderColor: "#05D1FF",
      iconColor: "#05D1FF",
      glowColor: "rgba(5, 209, 255, 0.3)",
    },
    default: {
      borderColor: "#ffa600",
      iconColor: "#FF9900",
      glowColor: "rgba(255, 153, 0, 0.3)",
    },
  };

  const styles = toastStyles[type as keyof typeof toastStyles] || toastStyles.default;
  const message = data?.title || "";

  // SVG Icons
  const getIcon = () => {
    const iconProps = { width: 24, height: 24, color: styles.iconColor };
    switch (type) {
      case "success":
        return (
          <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case "error":
        return (
          <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case "warning":
        return (
          <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case "info":
        return (
          <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        minWidth: '320px',
        maxWidth: '400px',
        backgroundColor: '#000000',
        background: '#000000',
        borderRadius: '16px',
        padding: '16px',
        fontFamily: '"Orbitron", sans-serif',
        border: `3.5px solid ${styles.borderColor}`,
        boxShadow: `0px 4px 30px 0px ${styles.glowColor}`,
        boxSizing: 'border-box',
        display: 'block',
        width: '100%',
      }}
    >
      {/* Close Button */}
      <button
        onClick={closeToast}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          padding: '4px',
          borderRadius: '8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label="Close notification"
      >
        <svg 
          style={{ width: '16px', height: '16px', color: 'rgba(255, 255, 255, 0.7)' }}
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Content */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingRight: '24px' }}>
        {/* Icon */}
        <div
          style={{ 
            flexShrink: 0, 
            marginTop: '2px',
            color: styles.iconColor 
          }}
        >
          {/* {getIcon()} */}
        </div>

        {/* Text Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ 
            color: '#ffffff', 
            fontSize: '14px', 
            fontWeight: 'bold', 
            lineHeight: 1.25,
            wordWrap: 'break-word',
            margin: 0,
          }}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

const defaultOptions: ToastOptions = {
  position: "bottom-right",
  autoClose: 5000,
  hideProgressBar: true,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 60,
};

// Create a component that works with react-toastify's ToastContentProps
const createToastComponent = (message: string, toastType: string): React.FC<ToastContentProps<unknown>> => {
  return (props: ToastContentProps<unknown>) => (
    <CustomToastContent 
      closeToast={props.closeToast} 
      data={{ title: message }}
      type={toastType}
    />
  );
};

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    const ToastComponent = createToastComponent(message, "success");
    return toastify(ToastComponent, {
      ...defaultOptions,
      ...options,
      type: "success",
    });
  },

  error: (message: string, options?: ToastOptions) => {
    const ToastComponent = createToastComponent(message, "error");
    return toastify(ToastComponent, {
      ...defaultOptions,
      ...options,
      type: "error",
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    const ToastComponent = createToastComponent(message, "warning");
    return toastify(ToastComponent, {
      ...defaultOptions,
      ...options,
      type: "warning",
    });
  },

  info: (message: string, options?: ToastOptions) => {
    const ToastComponent = createToastComponent(message, "info");
    return toastify(ToastComponent, {
      ...defaultOptions,
      ...options,
      type: "info",
    });
  },

  // Direct access to toastify for advanced usage
  original: toastify,
};

export default toast;
