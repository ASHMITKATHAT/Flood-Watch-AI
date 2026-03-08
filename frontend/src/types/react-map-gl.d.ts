declare module 'react-map-gl/maplibre' {
    import { ComponentType, Ref, ReactNode } from 'react';

    export interface ViewState {
        longitude: number;
        latitude: number;
        zoom: number;
        pitch?: number;
        bearing?: number;
        padding?: { top: number; bottom: number; left: number; right: number };
    }

    export interface ViewStateChangeEvent {
        viewState: ViewState;
    }

    export interface MapRef {
        getMap(): any;
    }

    export interface MapProps {
        ref?: Ref<MapRef>;
        mapStyle?: string;
        style?: React.CSSProperties;
        attributionControl?: boolean;
        antialias?: boolean;
        longitude?: number;
        latitude?: number;
        zoom?: number;
        pitch?: number;
        bearing?: number;
        onMove?: (evt: ViewStateChangeEvent) => void;
        onLoad?: () => void;
        children?: ReactNode;
        [key: string]: any;
    }

    export interface SourceProps {
        id: string;
        type: string;
        data?: any;
        url?: string;
        tileSize?: number;
        maxzoom?: number;
        children?: ReactNode;
    }

    export interface LayerProps {
        id: string;
        type: string;
        paint?: Record<string, any>;
        layout?: Record<string, any>;
        source?: string;
        'source-layer'?: string;
        [key: string]: any;
    }

    export interface MarkerProps {
        longitude: number;
        latitude: number;
        anchor?: string;
        children?: ReactNode;
    }

    const Map: ComponentType<MapProps>;
    export const Source: ComponentType<SourceProps>;
    export const Layer: ComponentType<LayerProps>;
    export const Marker: ComponentType<MarkerProps>;

    export default Map;
}
