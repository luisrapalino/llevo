import { useEffect } from 'react';
import { Toaster as Sonner, toast } from 'sonner';

interface Props {
  /** Mensaje que llega por la URL después de una acción del servidor (?ok= / ?error=). */
  flash?: { type: 'success' | 'error'; message: string } | null;
}

export default function Toaster({ flash }: Props) {
  useEffect(() => {
    if (!flash?.message) return;
    flash.type === 'error' ? toast.error(flash.message) : toast.success(flash.message);
  }, []);

  return (
    <Sonner
      position="top-center"
      offset={72}
      mobileOffset={{ top: 72 }}
      closeButton
      style={
        {
          '--normal-bg': '#fdfbf7',
          '--normal-text': '#1f1b16',
          '--normal-border': 'rgb(31 27 22 / 0.14)',
          '--border-radius': '12px',
          fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, sans-serif",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: '!shadow-[0_8px_24px_rgba(31,27,22,0.10)] !text-[15px]',
          description: '!text-[#5e554a]',
          success: '[&_[data-icon]]:!text-[#16a34a]',
          error: '[&_[data-icon]]:!text-[#dc2626]',
          actionButton: '!bg-[#1f1b16] !text-white !rounded-lg',
        },
      }}
    />
  );
}
