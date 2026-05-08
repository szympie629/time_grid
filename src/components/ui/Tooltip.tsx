"use client";
import { createPortal } from "react-dom";
import { useState, useRef, ReactNode } from "react";

export const Tooltip = ({ children, content }: { children: ReactNode; content: string }) => {
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top + window.scrollY - 8,
                left: rect.left + rect.width / 2
            });
        }
    };

    return (
        <div
            ref={triggerRef}
            className="inline-flex items-center"
            onMouseEnter={() => { updatePosition(); setVisible(true); }}
            onMouseLeave={() => setVisible(false)}
        >
            {children}
            {visible && createPortal(
                <div
                    className="fixed z-[9999] px-2 py-1.5 text-[10px] text-white dark:text-gray-900 bg-gray-900 dark:bg-gray-100 rounded shadow-xl -translate-x-1/2 -translate-y-full pointer-events-none w-48 leading-relaxed"
                    style={{ top: coords.top, left: coords.left }}
                >
                    {content}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                </div>,
                document.body
            )}
        </div>
    );
};