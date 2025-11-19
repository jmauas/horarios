'use client';

export default function ModalNotificacion({ isOpen, onClose, title, message, type = 'info' }) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-auto border-2 border-gray-100 animate-fade-in">
        <div className={`p-6 rounded-t-lg border-b-2 ${getColorClasses()}`}>
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{getIcon()}</span>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-700 text-base">{message}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalConfirmacion({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-auto border-2 border-gray-100 animate-fade-in">
        <div className="p-6">
          <div className="flex items-start space-x-3 mb-4">
            <span className="text-4xl">❓</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              <div className="text-gray-700">{message}</div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-b-lg flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 bg-gray-500 text-white font-medium hover:bg-gray-600 transition-colors"
          >
            <span className="mr-2">✖</span>
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            <span className="mr-2">✓</span>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}