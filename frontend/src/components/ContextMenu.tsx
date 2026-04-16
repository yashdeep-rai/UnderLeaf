import React, { useState, useRef, useEffect } from 'react';

interface ContextMenuProps {
  items: {
    label: string;
    icon?: React.ReactNode;
    action?: () => void;
    danger?: boolean;
    separator?: boolean;
    disabled?: boolean;
  }[];
}

interface ContextMenuState {
  x: number;
  y: number;
  visible: boolean;
}

export function useContextMenu(items: ContextMenuProps['items']) {
  const [menu, setMenu] = useState<ContextMenuState>({ x: 0, y: 0, visible: false });

  const open = (e: React.MouseEvent) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - items.length * 36 - 16);
    setMenu({ x, y, visible: true });
  };

  const close = () => setMenu(m => ({ ...m, visible: false }));

  useEffect(() => {
    if (!menu.visible) return;
    const handler = (e: MouseEvent) => { e.target; close(); };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [menu.visible]);

  const Menu = () => {
    if (!menu.visible) return null;
    return (
      <div
        className="context-menu"
        style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 9999 }}
        onClick={e => e.stopPropagation()}
      >
        {items.map((item, i) =>
          item.separator ? (
            <div key={i} className="context-separator" />
          ) : (
            <button
              key={i}
              disabled={item.disabled}
              className={`context-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
              onClick={() => {
                close();
                item.action?.();
              }}
            >
              {item.icon && <span className="context-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          )
        )}
      </div>
    );
  };

  return { open, close, Menu };
}
