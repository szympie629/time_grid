declare module 'react-resizable-panels' {
    import { FC, ReactNode, RefObject, CSSProperties, HTMLAttributes } from 'react';

    export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
        id?: string;
        className?: string;
        style?: CSSProperties;
        defaultSize?: number;
        minSize?: number;
        maxSize?: number;
        collapsible?: boolean;
        collapsedSize?: number;
        order?: number;
        onCollapse?: () => void;
        onExpand?: () => void;
        onResize?: (size: number, prevSize: number) => void;
        children?: ReactNode;
        ref?: RefObject<any> | ((instance: any) => void) | null;
    }

    export interface PanelGroupProps extends HTMLAttributes<HTMLDivElement> {
        direction?: 'horizontal' | 'vertical'; 
        orientation?: 'horizontal' | 'vertical'; 
        id?: string;
        className?: string;
        style?: CSSProperties;
        onLayout?: (sizes: number[]) => void;
        autoSaveId?: string;
        children?: ReactNode;
        ref?: RefObject<any> | ((instance: any) => void) | null;
    }

    export interface PanelResizeHandleProps extends HTMLAttributes<HTMLDivElement> {
        id?: string;
        className?: string;
        style?: CSSProperties;
        disabled?: boolean;
        hitAreaMargins?: { coarse: number; fine: number };
        onDragging?: (isDragging: boolean) => void;
        children?: ReactNode;
        ref?: RefObject<any> | ((instance: any) => void) | null;
    }

    export const Panel: FC<PanelProps>;
    export const PanelGroup: FC<PanelGroupProps>;
    export const PanelResizeHandle: FC<PanelResizeHandleProps>;
}
