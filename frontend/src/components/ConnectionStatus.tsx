import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { addConnectionListener, removeConnectionListener, getConnectionStatus } from '@/lib/api';

const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(getConnectionStatus());
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Listen for connection changes
    const handleConnectionChange = (online: boolean) => {
      setIsOnline(online);
      
      // Show message when connection changes
      if (!online) {
        setShowMessage(true);
      } else {
        // Hide message after 3 seconds when connection restored
        setTimeout(() => setShowMessage(false), 3000);
      }
    };

    addConnectionListener(handleConnectionChange);

    // Cleanup listener when component unmounts
    return () => {
      removeConnectionListener(handleConnectionChange);
    };
  }, []);

  // Don't show anything if online and no recent changes
  if (isOnline && !showMessage) {
    return null;
  }

  return (
    <div className={`
      fixed top-4 right-4 z-50 
      px-3 py-2 rounded-lg shadow-lg
      flex items-center space-x-2
      transition-all duration-300 ease-in-out
      ${isOnline 
        ? 'bg-green-600 text-white' 
        : 'bg-red-600 text-white animate-pulse'
      }
    `}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Reconnecting...</span>
        </>
      )}
    </div>
  );
};

export default ConnectionStatus;