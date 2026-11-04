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
          '--normal-bg': '#ffffff',
          '--normal-text': '#14213d',
          '--normal-border': 'rgb(20 33 61 / 0.14)',
          '--border-radius': '12px',
          fontFamily: "'Nunito Variable', ui-sans-serif, system-ui, sans-serif",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: '!shadow-[0_8px_24px_rgba(20,33,61,0.10)] !text-[15px]',
          description: '!text-[#4a5470]',
          success: '[&_[data-icon]]:!text-[#16a34a]',
          error: '[&_[data-icon]]:!text-[#dc2626]',
          actionButton: '!bg-[#14213d] !text-white !rounded-lg',
        },
      }}
    />
  );
}
