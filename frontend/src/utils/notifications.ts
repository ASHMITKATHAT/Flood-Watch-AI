export const notifications = {
  showSuccess(message: string, title = 'Success') {
    this.showNotification(title, message, 'success');
  },

  showError(message: string, title = 'Error') {
    this.showNotification(title, message, 'error');
  },

  showWarning(message: string, title = 'Warning') {
    this.showNotification(title, message, 'warning');
  },

  showInfo(message: string, title = 'Info') {
    this.showNotification(title, message, 'info');
  },

  showNotification(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    // Check if browser notifications are supported and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
      });
    }

    // Also show in-app notification
    const event = new CustomEvent('show-notification', {
      detail: { title, message, type, timestamp: new Date() },
    });
    window.dispatchEvent(event);

    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
  },

  requestPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!('Notification' in window)) {
        resolve(false);
        return;
      }

      if (Notification.permission === 'granted') {
        resolve(true);
      } else if (Notification.permission === 'denied') {
        resolve(false);
      } else {
        Notification.requestPermission().then(permission => {
          resolve(permission === 'granted');
        });
      }
    });
  },
};