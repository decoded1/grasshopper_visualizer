let isDraggingWire = false;
let sourceAnchorInfo = {
    element: null,
    nodeInstanceId: null,
    anchorDefAddress: null,
    anchorType: null
};
let tempWireElement = null;
let svgLayerRef = null;
let getMousePosInWorkspaceRef = null;
let getPanZoomStateRef = null;
let addConnectionCallbackRef = null;
let activeNodeInstancesRef = null;
let onWireDragEndCallbackRef = null;


export function initWireManager(
    anchorDomElement,
    nodeInstanceId,
    anchorDefAddress,
    anchorType,
    dependencies
) {
    svgLayerRef = dependencies.svgLayer;
    getMousePosInWorkspaceRef = dependencies.getMousePosInWorkspace;
    getPanZoomStateRef = dependencies.getPanZoomState;
    addConnectionCallbackRef = dependencies.addConnection;
    activeNodeInstancesRef = dependencies.activeNodeInstances;
    onWireDragEndCallbackRef = dependencies.onWireDragEnd;

    anchorDomElement.addEventListener('mousedown', (event) => {
        onAnchorMouseDown(event, anchorDomElement, nodeInstanceId, anchorDefAddress, anchorType);
    });
    anchorDomElement.addEventListener('mouseup', (event) => {
        onAnchorMouseUp(event, anchorDomElement, nodeInstanceId, anchorDefAddress, anchorType);
    });
}

function onAnchorMouseDown(event, anchorElement, nodeInstanceId, anchorDefAddress, anchorType) {
    event.stopPropagation();
    event.preventDefault();

    if (anchorType === 'output') {
        isDraggingWire = true;
        sourceAnchorInfo = { element: anchorElement, nodeInstanceId, anchorDefAddress, anchorType };
        anchorElement.classList.add('active-drag');

        if (!tempWireElement) {
            tempWireElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            tempWireElement.setAttribute('class', 'wire temp-wire');
            svgLayerRef.appendChild(tempWireElement);
        }
        updateTempWire(event);

        document.addEventListener('mousemove', handleWireMouseMove);
        document.addEventListener('mouseup', handleWireMouseUp, { once: true });
    }
}

export function handleWireMouseMove(event) {
    if (!isDraggingWire) return;
    event.preventDefault();
    updateTempWire(event);
}

function updateTempWire(event) {
    if (!isDraggingWire || !tempWireElement || !sourceAnchorInfo.element) return;

    const sourceNode = activeNodeInstancesRef[sourceAnchorInfo.nodeInstanceId];
    if (!sourceNode) {
        cleanupWireDrag();
        return;
    }
    const sourceAnchorData = sourceNode.getAnchorByDefAddress(sourceAnchorInfo.anchorDefAddress);
    if (!sourceAnchorData) {
        cleanupWireDrag();
        return;
    }

    const panZoom = getPanZoomStateRef();
    const anchorRect = sourceAnchorInfo.element.getBoundingClientRect();
    const svgRect = svgLayerRef.getBoundingClientRect();


    const startX = (anchorRect.left + anchorRect.width / 2 - svgRect.left) / panZoom.scale;
    const startY = (anchorRect.top + anchorRect.height / 2 - svgRect.top) / panZoom.scale;

    const mouseInWorkspace = getMousePosInWorkspaceRef(event);
    const endX = mouseInWorkspace.x;
    const endY = mouseInWorkspace.y;

    const dx = Math.abs(endX - startX);
    const cp1x = startX + dx * 0.6;
    const cp1y = startY;
    const cp2x = endX - dx * 0.6;
    const cp2y = endY;

    tempWireElement.setAttribute('d', `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`);
}


function onAnchorMouseUp(event, targetAnchorElement, targetNodeId, targetAnchorDefAddr, targetAnchorType) {
    if (isDraggingWire && sourceAnchorInfo.element !== targetAnchorElement && targetAnchorType === 'input') {
        event.stopPropagation();
        event.preventDefault();

        if (addConnectionCallbackRef) {
            addConnectionCallbackRef(
                sourceAnchorInfo.nodeInstanceId,
                sourceAnchorInfo.anchorDefAddress,
                targetNodeId,
                targetAnchorDefAddr
            );
        }
    }
    if (isDraggingWire){
        cleanupWireDrag();
    }
}

export function handleWireMouseUp(event) {
    if (!isDraggingWire) return;

    const targetElement = event.target;
    if (targetElement.classList.contains('connector') && targetElement.dataset.portType === 'input' && targetElement !== sourceAnchorInfo.element) {
        const targetNodeId = targetElement.closest('.gh-node, .gh-value-display')?.id;
        const targetAnchorDefAddr = targetElement.dataset.portId;
        if (targetNodeId && targetAnchorDefAddr && addConnectionCallbackRef) {
            addConnectionCallbackRef(
                sourceAnchorInfo.nodeInstanceId,
                sourceAnchorInfo.anchorDefAddress,
                targetNodeId,
                targetAnchorDefAddr
            );
        }
    }
    cleanupWireDrag();
}

function cleanupWireDrag() {
    if (sourceAnchorInfo.element) {
        sourceAnchorInfo.element.classList.remove('active-drag');
    }
    if (tempWireElement) {
        tempWireElement.remove();
        tempWireElement = null;
    }
    isDraggingWire = false;
    sourceAnchorInfo = { element: null, nodeInstanceId: null, anchorDefAddress: null, anchorType: null };
    document.removeEventListener('mousemove', handleWireMouseMove);
    document.removeEventListener('mouseup', handleWireMouseUp);

    if(onWireDragEndCallbackRef) {
        onWireDragEndCallbackRef();
    }
}

export function getWireDragSource() {
    return { ...sourceAnchorInfo, tempWireElement };
}

export function isWireDragging() {
    return isDraggingWire;
}

export function clearTempWire() {
    if (tempWireElement) {
        tempWireElement.remove();
        tempWireElement = null;
    }
}