let panZoomState = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let lastPanMousePosition = { x: 0, y: 0 };
let lastTouchPosition = { x: 0, y: 0 };

let workspaceContainerElement = null;
let workspaceElement = null;
let onPanZoomUpdateCallback = null;

export function initPanZoom(container, workspace, initialState, onUpdate) {
    workspaceContainerElement = container;
    workspaceElement = workspace;
    if (initialState) {
        panZoomState = { ...initialState };
    }
    onPanZoomUpdateCallback = onUpdate;

    workspaceContainerElement.addEventListener('mousedown', handlePanStart);
    workspaceContainerElement.addEventListener('mousemove', handlePanMove);
    workspaceContainerElement.addEventListener('mouseup', handlePanEnd);
    workspaceContainerElement.addEventListener('mouseleave', handlePanEnd); // Stop panning if mouse leaves
    workspaceContainerElement.addEventListener('wheel', handleZoom, { passive: false });
    
    // Touch events for mobile/tablet
    workspaceContainerElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    workspaceContainerElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    workspaceContainerElement.addEventListener('touchend', handleTouchEnd);
    workspaceContainerElement.addEventListener('touchcancel', handleTouchEnd);

    applyPanZoomStyle(); // Apply initial state
}

function handlePanStart(event) {
    if (event.button === 1 || (event.button === 0 && event.altKey) || (event.button === 0 && event.shiftKey)) { // Middle mouse, Alt+Left Click, or Shift+Left Click
        isPanning = true;
        lastPanMousePosition = { x: event.clientX, y: event.clientY };
        workspaceContainerElement.style.cursor = 'grabbing';
        event.preventDefault();
    }
}

function handlePanMove(event) {
    if (!isPanning) return;
    event.preventDefault();

    const dx = event.clientX - lastPanMousePosition.x;
    const dy = event.clientY - lastPanMousePosition.y;

    panZoomState.x += dx;
    panZoomState.y += dy;

    lastPanMousePosition = { x: event.clientX, y: event.clientY };
    applyPanZoomStyle();
    if (onPanZoomUpdateCallback) {
        onPanZoomUpdateCallback();
    }
}

function handlePanEnd(event) {
    if (isPanning) {
        isPanning = false;
        workspaceContainerElement.style.cursor = 'default';
    }
}

// Touch event handlers
function handleTouchStart(event) {
    // Detect Shift + two finger touch (using two fingers)
    if ((event.touches.length === 2 && event.shiftKey) || event.touches.length === 2) {
        isPanning = true;
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        // Use the midpoint between the two touches
        lastTouchPosition = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
        event.preventDefault();
    }
}

function handleTouchMove(event) {
    if (!isPanning || event.touches.length !== 2) return;
    event.preventDefault();
    
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const currentMidpoint = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
    };
    
    const dx = currentMidpoint.x - lastTouchPosition.x;
    const dy = currentMidpoint.y - lastTouchPosition.y;
    
    panZoomState.x += dx;
    panZoomState.y += dy;
    
    lastTouchPosition = currentMidpoint;
    applyPanZoomStyle();
    if (onPanZoomUpdateCallback) {
        onPanZoomUpdateCallback();
    }
}

function handleTouchEnd(event) {
    if (isPanning && event.touches.length < 2) {
        isPanning = false;
    }
}

function handleZoom(event) {
    event.preventDefault();
    const zoomIntensity = 0.1;
    const direction = event.deltaY < 0 ? 1 : -1;
    const scaleAmount = 1 + direction * zoomIntensity;

    const containerRect = workspaceContainerElement.getBoundingClientRect();
    const mouseX = event.clientX - containerRect.left; // Mouse position relative to container
    const mouseY = event.clientY - containerRect.top;

    const worldX = (mouseX - panZoomState.x) / panZoomState.scale;
    const worldY = (mouseY - panZoomState.y) / panZoomState.scale;

    panZoomState.scale *= scaleAmount;
    panZoomState.scale = Math.max(0.1, Math.min(panZoomState.scale, 5)); // Clamp zoom

    panZoomState.x = mouseX - worldX * panZoomState.scale;
    panZoomState.y = mouseY - worldY * panZoomState.scale;

    applyPanZoomStyle();
    if (onPanZoomUpdateCallback) {
        onPanZoomUpdateCallback();
    }
}

export function applyPanZoomStyle() {
    if (workspaceElement) {
        workspaceElement.style.transform = `translate(${panZoomState.x}px, ${panZoomState.y}px) scale(${panZoomState.scale})`;
        const bgSize = 25 * panZoomState.scale;
        workspaceElement.style.backgroundSize = `${bgSize}px ${bgSize}px, ${bgSize}px ${bgSize}px, ${bgSize}px ${bgSize}px, ${bgSize}px ${bgSize}px`; // Update all four for the mockup
        workspaceElement.style.backgroundPosition = `${panZoomState.x % bgSize}px ${panZoomState.y % bgSize}px`;
    }
}

export function getMousePosInWorkspace(event) {
    if (!workspaceContainerElement) return { x: event.clientX, y: event.clientY };
    const containerRect = workspaceContainerElement.getBoundingClientRect();
    return {
        x: (event.clientX - containerRect.left - panZoomState.x) / panZoomState.scale,
        y: (event.clientY - containerRect.top - panZoomState.y) / panZoomState.scale
    };
}

export function getPanZoomState() {
    return { ...panZoomState };
}

export function zoomIn() {
    const scaleAmount = 1.2;
    const containerRect = workspaceContainerElement.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    const worldX = (centerX - panZoomState.x) / panZoomState.scale;
    const worldY = (centerY - panZoomState.y) / panZoomState.scale;

    panZoomState.scale *= scaleAmount;
    panZoomState.scale = Math.min(panZoomState.scale, 5);

    panZoomState.x = centerX - worldX * panZoomState.scale;
    panZoomState.y = centerY - worldY * panZoomState.scale;

    applyPanZoomStyle();
    if (onPanZoomUpdateCallback) onPanZoomUpdateCallback();
}

export function zoomOut() {
    const scaleAmount = 1 / 1.2;
    const containerRect = workspaceContainerElement.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    const worldX = (centerX - panZoomState.x) / panZoomState.scale;
    const worldY = (centerY - panZoomState.y) / panZoomState.scale;

    panZoomState.scale *= scaleAmount;
    panZoomState.scale = Math.max(0.1, panZoomState.scale);

    panZoomState.x = centerX - worldX * panZoomState.scale;
    panZoomState.y = centerY - worldY * panZoomState.scale;

    applyPanZoomStyle();
    if (onPanZoomUpdateCallback) onPanZoomUpdateCallback();
}

export function zoomReset() {
    panZoomState.x = 0;
    panZoomState.y = 0;
    panZoomState.scale = 1;
    applyPanZoomStyle();
    if (onPanZoomUpdateCallback) onPanZoomUpdateCallback();
}