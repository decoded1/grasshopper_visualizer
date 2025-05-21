let selectedNodeContainers = [];
let isBoxSelecting = false;
let boxSelectStartCoords = { x: 0, y: 0 };
let selectionBoxElement = null;
let workspaceElementRef = null;
let svgLayerElementRef = null;
let activeNodeInstancesRef = null;
let getPanZoomStateRef = null;
let getMousePosInWorkspaceRef = null;
let updateSelectionVisualsCallbackRef = null;
let isShiftPressedCallbackRef = null;
let nodeDragInProgress = false;
let panInProgress = false;

export function initSelectionHandling(
    workspaceEl,
    svgLayerEl,
    nodesRef,
    panZoomStateGetter,
    mousePosGetter,
    visualsUpdater,
    shiftChecker
) {
    workspaceElementRef = workspaceEl.parentElement; // Usually workspaceContainer
    svgLayerElementRef = svgLayerEl;
    activeNodeInstancesRef = nodesRef;
    getPanZoomStateRef = panZoomStateGetter;
    getMousePosInWorkspaceRef = mousePosGetter;
    updateSelectionVisualsCallbackRef = visualsUpdater;
    isShiftPressedCallbackRef = shiftChecker;
    selectionBoxElement = document.getElementById('selectionBox');

    if (workspaceElementRef) {
        workspaceElementRef.addEventListener('mousedown', onWorkspaceMouseDownForBoxSelect);
    }
}

export function getSelectedNodeContainers() {
    return selectedNodeContainers;
}

export function clearSelection() {
    selectedNodeContainers = [];
    if (updateSelectionVisualsCallbackRef) {
        updateSelectionVisualsCallbackRef(selectedNodeContainers);
    }
}

export function addNodeToSelection(nodeContainer) {
    if (!selectedNodeContainers.includes(nodeContainer)) {
        selectedNodeContainers.push(nodeContainer);
    }
    if (updateSelectionVisualsCallbackRef) {
        updateSelectionVisualsCallbackRef(selectedNodeContainers);
    }
}

export function removeNodeFromSelection(nodeContainer) {
    selectedNodeContainers = selectedNodeContainers.filter(el => el !== nodeContainer);
    if (updateSelectionVisualsCallbackRef) {
        updateSelectionVisualsCallbackRef(selectedNodeContainers);
    }
}

export function setNodeDragInProgress(status) {
    nodeDragInProgress = status;
}
export function setPanInProgress(status) {
    panInProgress = status;
}


function onWorkspaceMouseDownForBoxSelect(event) {
    if (event.button !== 0) return;
    if (nodeDragInProgress || panInProgress) return;

    const target = event.target;
    const isNodeClick = target.closest('.gh-node-container');
    const isAnchorClick = target.classList.contains('connector');
    const isScrollbarClick =
        event.offsetX >= workspaceElementRef.clientWidth ||
        event.offsetY >= workspaceElementRef.clientHeight;

    if (isNodeClick || isAnchorClick || isScrollbarClick) {
        return;
    }

    if (target === workspaceElementRef || target === workspaceElementRef.querySelector('.workspace') || target === svgLayerElementRef) {
        event.preventDefault();

        boxSelectStartCoords = getMousePosInWorkspaceRef(event);

        if (selectionBoxElement) {
            Object.assign(selectionBoxElement.style, {
                left: `${boxSelectStartCoords.x}px`,
                top: `${boxSelectStartCoords.y}px`,
                width: '0px',
                height: '0px',
                display: 'block'
            });
        }
        isBoxSelecting = true;
        document.addEventListener('mousemove', onWorkspaceMouseMoveForBoxSelect);
        document.addEventListener('mouseup', onWorkspaceMouseUpForBoxSelect, { once: true });
    }
}

function onWorkspaceMouseMoveForBoxSelect(event) {
    if (!isBoxSelecting) return;
    event.preventDefault();

    const currentMouse = getMousePosInWorkspaceRef(event);
    const panZoom = getPanZoomStateRef();

    const newX = Math.min(boxSelectStartCoords.x, currentMouse.x);
    const newY = Math.min(boxSelectStartCoords.y, currentMouse.y);
    const width = Math.abs(currentMouse.x - boxSelectStartCoords.x);
    const height = Math.abs(currentMouse.y - boxSelectStartCoords.y);

    if (selectionBoxElement) {
        selectionBoxElement.style.left = `${(newX * panZoom.scale) + panZoom.x}px`;
        selectionBoxElement.style.top = `${(newY * panZoom.scale) + panZoom.y}px`;
        selectionBoxElement.style.width = `${width * panZoom.scale}px`;
        selectionBoxElement.style.height = `${height * panZoom.scale}px`;
    }
}

function onWorkspaceMouseUpForBoxSelect(event) {
    document.removeEventListener('mousemove', onWorkspaceMouseMoveForBoxSelect);
    if (!isBoxSelecting) { // Was a simple click on workspace
        if (!isShiftPressedCallbackRef() && !event.target.closest('.gh-node-container')) {
            clearSelection();
        }
    } else { // Box selection drag ended
        const boxRect = {
            left: parseFloat(selectionBoxElement.style.left),
            top: parseFloat(selectionBoxElement.style.top),
            width: parseFloat(selectionBoxElement.style.width),
            height: parseFloat(selectionBoxElement.style.height)
        };
        const panZoom = getPanZoomStateRef();
        const boxRectWorkspace = {
            left: (boxRect.left - panZoom.x) / panZoom.scale,
            top: (boxRect.top - panZoom.y) / panZoom.scale,
            right: (boxRect.left - panZoom.x + boxRect.width) / panZoom.scale,
            bottom: (boxRect.top - panZoom.y + boxRect.height) / panZoom.scale,
        };


        let newlySelectedInBox = [];
        Object.values(activeNodeInstancesRef).forEach(nodeInst => {
            if (nodeInst.domElement) {
                const nodeRect = {
                    left: nodeInst.x,
                    top: nodeInst.y,
                    right: nodeInst.x + nodeInst.width,
                    bottom: nodeInst.y + nodeInst.height
                };
                if (checkIntersection(boxRectWorkspace, nodeRect)) {
                    newlySelectedInBox.push(nodeInst.domElement);
                }
            }
        });

        if (!isShiftPressedCallbackRef()) {
            selectedNodeContainers = newlySelectedInBox;
        } else {
            newlySelectedInBox.forEach(container => {
                if (!selectedNodeContainers.includes(container)) {
                    selectedNodeContainers.push(container);
                }
            });
        }
        if(updateSelectionVisualsCallbackRef) updateSelectionVisualsCallbackRef(selectedNodeContainers);
    }

    if (selectionBoxElement) {
        selectionBoxElement.style.display = 'none';
        selectionBoxElement.style.width = '0px';
        selectionBoxElement.style.height = '0px';
    }
    isBoxSelecting = false;
}

function checkIntersection(r1, r2) {
    return !(r2.left >= r1.right ||
             r2.right <= r1.left ||
             r2.top >= r1.bottom ||
             r2.bottom <= r1.top);
}

export function updateNodeSelectionOnClick(nodeContainer, isShiftPressed) {
    const currentlySelected = selectedNodeContainers.includes(nodeContainer);
    if (isShiftPressed) {
        if (currentlySelected) {
            removeNodeFromSelection(nodeContainer);
        } else {
            addNodeToSelection(nodeContainer);
        }
    } else {
        if (!currentlySelected || selectedNodeContainers.length > 1) {
            clearSelection();
            addNodeToSelection(nodeContainer);
        }
    }
    if(updateSelectionVisualsCallbackRef) updateSelectionVisualsCallbackRef(selectedNodeContainers);
}