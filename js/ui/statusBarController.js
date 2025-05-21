let statusBarElement = null;
let statusInfoLeftElement = null;
let statusInfoCoordsElement = null;
let statusInfoRightElement = null;
let getPanZoomStateCallback = null;

export function initStatusBar(
    barElement,
    leftElement,
    coordsElement,
    rightElement,
    panZoomStateGetter
) {
    statusBarElement = barElement;
    statusInfoLeftElement = leftElement;
    statusInfoCoordsElement = coordsElement;
    statusInfoRightElement = rightElement;
    getPanZoomStateCallback = panZoomStateGetter;

    updateStatusBarInfo({ left: "Initialized.", nodes: 0, connections: 0 });
    updateCoordsDisplay(0, 0);
}

export function updateStatusBarInfo(info = {}) {
    if (statusInfoLeftElement && info.left !== undefined) {
        statusInfoLeftElement.textContent = info.left;
    }

    if (statusInfoRightElement) {
        const nodesCount = info.nodes !== undefined ? info.nodes : (statusInfoRightElement.textContent.match(/Nodes: (\d+)/) || [])[1] || 0;
        const connectionsCount = info.connections !== undefined ? info.connections : (statusInfoRightElement.textContent.match(/Connections: (\d+)/) || [])[1] || 0;
        statusInfoRightElement.textContent = `Nodes: ${nodesCount} | Connections: ${connectionsCount}`;
    }

    if (getPanZoomStateCallback) {
        const panZoomState = getPanZoomStateCallback();
        const zoomDisplay = document.getElementById('zoomLevelDisplay');
        if (zoomDisplay) {
             zoomDisplay.textContent = `${(panZoomState.scale * 100).toFixed(0)}%`;
        }
    }
}

export function updateCoordsDisplay(mouseX, mouseY) {
    if (statusInfoCoordsElement) {
        statusInfoCoordsElement.textContent = `X: ${Math.round(mouseX)}, Y: ${Math.round(mouseY)}`;
    }
}