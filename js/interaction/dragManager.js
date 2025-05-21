let draggedNodeInstance = null;
let dragStartMouseInWorkspace = { x: 0, y: 0 };
let initialNodePositionsForDrag = [];
let nodeDragJustStarted = false;

let panZoomStateRef = null;
let getMousePosInWorkspaceRef = null;
let setNodeFixedPositionInLayoutRef = null;
let releaseNodeFixedPositionInLayoutRef = null;
let onDragMoveCallbackRef = null;
let onDragEndCallbackRef = null;
let isShiftPressedCallbackRef = null;
let getSelectedNodesCallbackRef = null;
let getAllNodesCallbackRef = null;
let updateSelectionVisualsCallbackRef = null;


export function setDragReferences(references) {
    panZoomStateRef = references.getPanZoomState;
    getMousePosInWorkspaceRef = references.getMousePosInWorkspace;
    setNodeFixedPositionInLayoutRef = references.setNodeFixedPositionInLayout;
    releaseNodeFixedPositionInLayoutRef = references.releaseNodeFixedPositionInLayout;
    onDragMoveCallbackRef = references.onDragMove;
    onDragEndCallbackRef = references.onDragEnd;
    isShiftPressedCallbackRef = references.isShiftPressed;
    getSelectedNodesCallbackRef = references.getSelectedNodes;
    getAllNodesCallbackRef = references.getAllNodes;
    updateSelectionVisualsCallbackRef = references.updateSelectionVisuals;
}

export function clearDragReferences() {
    panZoomStateRef = null;
    getMousePosInWorkspaceRef = null;
    setNodeFixedPositionInLayoutRef = null;
    releaseNodeFixedPositionInLayoutRef = null;
    onDragMoveCallbackRef = null;
    onDragEndCallbackRef = null;
    isShiftPressedCallbackRef = null;
    getSelectedNodesCallbackRef = null;
    getAllNodesCallbackRef = null;
    updateSelectionVisualsCallbackRef = null;
}


function onNodeMouseDown(event, nodeInstance, nodeDomElement) {
    if (event.target.closest('.connector')) return;

    event.preventDefault();
    event.stopPropagation();

    draggedNodeInstance = nodeInstance;
    nodeDomElement.classList.add('dragging');
    dragStartMouseInWorkspace = getMousePosInWorkspaceRef(event);

    const currentSelectedContainers = getSelectedNodesCallbackRef();
    const isCurrentlySelected = currentSelectedContainers.some(container => container.dataset.id === nodeInstance.instanceId);

    if (isShiftPressedCallbackRef()) {
        if (isCurrentlySelected) {
        } else {
            currentSelectedContainers.push(nodeDomElement.closest('.gh-node-container'));
        }
    } else {
        if (!isCurrentlySelected) {
            clearSelectionAndVisuals();
            currentSelectedContainers.push(nodeDomElement.closest('.gh-node-container'));
        }
    }
    updateSelectionVisualsCallbackRef(currentSelectedContainers);


    initialNodePositionsForDrag = currentSelectedContainers.map(container => {
        const instId = container.dataset.id || container.querySelector('.gh-node, .gh-value-display')?.id;
        const inst = getAllNodesCallbackRef()[instId];
        return {
            instance: inst,
            initialLeft: inst.x,
            initialTop: inst.y
        };
    });

    nodeDragJustStarted = true;
    document.addEventListener('mousemove', handleNodeMouseMove);
    document.addEventListener('mouseup', handleNodeMouseUp, { once: true });
}

export function handleNodeMouseMove(event) {
    if (!draggedNodeInstance) return;
    event.preventDefault();

    if (nodeDragJustStarted) {
        initialNodePositionsForDrag.forEach(posInfo => {
            if (posInfo.instance && posInfo.instance.domElement) {
                 posInfo.instance.domElement.style.zIndex = '100';
                 posInfo.instance.isUserDragged = true;
            }
        });
        nodeDragJustStarted = false;
    }

    const currentMouseInWorkspace = getMousePosInWorkspaceRef(event);
    const deltaX = currentMouseInWorkspace.x - dragStartMouseInWorkspace.x;
    const deltaY = currentMouseInWorkspace.y - dragStartMouseInWorkspace.y;

    initialNodePositionsForDrag.forEach(posInfo => {
        if (posInfo.instance) {
            const newX = posInfo.initialLeft + deltaX;
            const newY = posInfo.initialTop + deltaY;
            posInfo.instance.updatePosition(newX, newY);
            if (setNodeFixedPositionInLayoutRef) {
                setNodeFixedPositionInLayoutRef(posInfo.instance.instanceId, newX, newY);
            }
        }
    });

    if (onDragMoveCallbackRef) {
        onDragMoveCallbackRef();
    }
}

export function handleNodeMouseUp(event) {
    document.removeEventListener('mousemove', handleNodeMouseMove);

    if (draggedNodeInstance) {
        draggedNodeInstance.domElement.classList.remove('dragging');
        initialNodePositionsForDrag.forEach(posInfo => {
            if (posInfo.instance && posInfo.instance.domElement) {
                 posInfo.instance.domElement.style.zIndex = '';
            }
            if (posInfo.instance && releaseNodeFixedPositionInLayoutRef && !posInfo.instance.isUserDraggedPersistently) {
                 releaseNodeFixedPositionInLayoutRef(posInfo.instance.instanceId);
            }
        });
    }

    if (onDragEndCallbackRef) {
        onDragEndCallbackRef();
    }

    draggedNodeInstance = null;
    initialNodePositionsForDrag = [];
    nodeDragJustStarted = false;
}

function clearSelectionAndVisuals() {
    const selected = getSelectedNodesCallbackRef();
    selected.length = 0;
    updateSelectionVisualsCallbackRef(selected);
}


export function initNodeDrag(nodeDomElement, nodeInstance, dependencies) {
    setDragReferences(dependencies);
    const draggableArea = nodeDomElement.querySelector('.gh-node-header') || nodeDomElement.querySelector('.gh-node') || nodeDomElement.querySelector('.gh-value-display');
    if (draggableArea) {
        draggableArea.addEventListener('mousedown', (e) => onNodeMouseDown(e, nodeInstance, nodeDomElement));
    } else {
        nodeDomElement.addEventListener('mousedown', (e) => onNodeMouseDown(e, nodeInstance, nodeDomElement));
    }
}