"use client";
import { createPortal } from "react-dom";
import { useState, useRef, ReactNode } from "react";

type TooltipPosition = "top" | "right";

export const Tooltip = ({ children, content, position = "top" }: { children: ReactNode; content: string; position?: TooltipPosition }) => {
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            if (position === "top") {
                setCoords({
                    top: rect.top + window.scrollY - 8,
                    left: rect.left + rect.width / 2
                });
            } else if (position === "right") {
                setCoords({
                    top: rect.top + rect.height / 2 + window.scrollY,
                    left: rect.right + 8
                });
            }
        }
    };

    const isTop = position === "top";

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
                    className={`fixed z-[9999] px-2 py-1.5 text-[10px] text-white dark:text-gray-900 bg-gray-900 dark:bg-gray-100 rounded shadow-xl pointer-events-none w-48 leading-relaxed ${
                        isTop ? "-translate-x-1/2 -translate-y-full" : "-translate-y-1/2"
                    }`}
                    style={{ top: coords.top, left: coords.left }}
                >
                    {content}
                    {isTop ? (
                        <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                    ) : (
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-100" />
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};