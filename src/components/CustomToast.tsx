import { ToastProps } from "react-toastify";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

interface CustomToastProps extends ToastProps {
  data?: {
    title?: string;
  };
}

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

const getIcon = (type: string) => {
  const iconClass = "w-6 h-6";
  switch (type) {
    case "success":
      return <CheckCircle className={iconClass} />;
    case "error":
      return <XCircle className={iconClass} />;
    case "warning":
      return <AlertCircle className={iconClass} />;
    case "info":
      return <Info className={iconClass} />;
    default:
      return <Info className={iconClass} />;
  }
};

const CustomToast = ({ closeToast, toastProps, data }: CustomToastProps) => {
  const { type = "default" } = toastProps;
  const styles = toastStyles[type as keyof typeof toastStyles] || toastStyles.default;
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeToast?.();
    }, 200);
  };

  // Get the message content
  const message = toastProps.children || data?.title || "";

  return (
    <div
      className={`relative min-w-[320px] max-w-[400px] bg-black rounded-2xl p-4 font-orbitron transition-all duration-200 ${
        isClosing ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
      }`}
      style={{
        border: `3.5px solid ${styles.borderColor}`,
        boxShadow: `0px 4px 30px 0px ${styles.glowColor}`,
      }}
    >
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 p-1 rounded-lg transition-all duration-200 hover:bg-white/10 group"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-white/70 group-hover:text-[#FF9900] transition-colors" />
      </button>

      {/* Content */}
      <div className="flex items-start gap-3 pr-6">
        {/* Icon */}
        <div
          className="flex-shrink-0 mt-0.5"
          style={{ color: styles.iconColor }}
        >
          {getIcon(type as string)}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold leading-tight break-words">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomToast;
