"use client";

import { useEffect, useRef } from "react";
import { useSidebar } from "@workspace/ui/components/sidebar";

const EDGE_WIDTH = 72;
const MIN_SWIPE_DISTANCE = 64;
const MAX_VERTICAL_DRIFT = 48;

type TouchStart = {
    x: number;
    y: number;
};

export const DashboardSwipeMenu = () => {
    const { isMobile, openMobile, setOpenMobile } = useSidebar();
    const touchStartRef = useRef<TouchStart | null>(null);

    useEffect(() => {
        if (!isMobile) {
            return;
        }

        const handleTouchStart = (event: TouchEvent) => {
            if (openMobile || event.touches.length !== 1) {
                touchStartRef.current = null;
                return;
            }

            const touch = event.touches[0];

            if (!touch || touch.clientX > EDGE_WIDTH) {
                touchStartRef.current = null;
                return;
            }

            touchStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
            };
        };

        const handleTouchEnd = (event: TouchEvent) => {
            const touchStart = touchStartRef.current;
            touchStartRef.current = null;

            if (!touchStart || event.changedTouches.length !== 1) {
                return;
            }

            const touch = event.changedTouches[0];

            if (!touch) {
                return;
            }

            const horizontalDelta = touch.clientX - touchStart.x;
            const verticalDelta = Math.abs(touch.clientY - touchStart.y);

            if (horizontalDelta >= MIN_SWIPE_DISTANCE && verticalDelta <= MAX_VERTICAL_DRIFT) {
                setOpenMobile(true);
            }
        };

        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [isMobile, openMobile, setOpenMobile]);

    return null;
};
