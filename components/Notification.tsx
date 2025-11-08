import React, { useEffect } from 'react';
import type { Notification as NotificationType } from '../types';
import { XIcon, CheckIcon } from './icons';

interface NotificationProps {
  notification: NotificationType;
  onDismiss: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const baseClasses = "relative w-full max-w-sm p-4 pr-10 overflow-hidden text-white border rounded-lg shadow-lg pointer-events-auto backdrop-blur-sm";
  const typeClasses = {
    success: 'bg-green-600/80 border-green-500/50',
    error: 'bg-red-600/80 border-red-500/50',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[notification.type]}`} role="alert">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {notification.type === 'success' ? (
            <CheckIcon className="w-6 h-6" />
          ) : (
            <XIcon className="w-6 h-6" />
          )}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">
            {notification.message}
          </p>
        </div>
      </div>
       <button
        onClick={() => onDismiss(notification.id)}
        className="absolute top-1 right-1 p-1 text-white/70 hover:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
      >
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};


interface NotificationContainerProps {
  notifications: NotificationType[];
  onDismiss: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({ notifications, onDismiss }) => {
  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]"
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
};
