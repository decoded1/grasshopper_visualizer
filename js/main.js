import { loadAndParseAllComponents } from './core/componentLoader.js';
import { generateUUID } from './core/utils.js';
import { NodeInstance } from './components/NodeInstance.js';
import { ValueDisplayInstance } from './components/ValueDisplayInstance.js';
import { Connection } from './components/Connection.js';

import { initNodeDrag } from './interaction/dragManager.js';
import { initPanZoom, applyPanZoomStyle as applyPanZoomTransformation, getMousePosInWorkspace as getMousePosFromPanZoom, zoomIn, zoomOut, zoomReset } from './interaction/panZoomManager.js';
import { initSelectionHandling, clearSelection as clearSelectionManager, setNodeDragInProgress, setPanInProgress, updateNodeSelectionOnClick } from './interaction/selectionManager.js';
import { initWireManager as initWireManagerEvents, getWireDragSource, isWireDragging as isWireManagerDragging } from './interaction/wireManager.js';
import { initForceDirectedLayout, updateLayoutData, setNodeFixedPosition as setD3NodeFixed, releaseNodeFixedPosition as releaseD3NodeFixed, reheatSimulation as reheatD3Simulation, updateLayoutCenterTarget as updateD3Center, stopSimulation as stopD3Simulation } from './layout/forceDirectedLayout.js';

import { initStatusBar, updateStatusBarInfo, updateCoordsDisplay } from './ui/statusBarController.js';
import { parseAndImplementRecipe, generateRecipeFromGraph } from './core/recipeManager.js';
import { initSyntaxInput, clearCurrentGraph as clearGraphFromRecipeManager } from './ui/syntaxInputController.js';
import { initToolbar } from './ui/toolbarController.js';

import {
    getActiveNodeInstances, addActiveNodeInstance, removeActiveNodeInstance, getNodeInstance, clearActiveNodeInstances,
    getActiveConnections, addActiveConnection, removeActiveConnection, getConnection, clearActiveConnections,
    getComponentLibrary, setComponentLibrary, getComponentCategories, setComponentCategories,
    getSelectedNodeContainers, setSelectedNodeContainers, addSelectedNodeContainer, removeSelectedNodeContainer, clearSelectedNodeContainers,
    getPanZoomState, setPanZoomState,
    getIsShiftKeyPressed, setIsShiftKeyPressed,
    getD3Simulation, setD3Simulation
} from './app-state.js';

const NODE_UI_CONFIG = {
    ANCHOR_WIDTH_PX: 14, ANCHOR_HEIGHT_PX: 14,
    ANCHOR_VERTICAL_GAP_PX: 10, NODE_EDGE_PADDING_FOR_ANCHORS_PX: 20,
    DEFAULT_NODE_WIDTH_PX: 200,
    NODE_MIN_HEIGHT_PX: 100,
    HEADER_HEIGHT_PX: 36,
    AUTO_LAYOUT_COL_WIDTH_PX: 300, AUTO_LAYOUT_ROW_HEIGHT_PX: 200,
    AUTO_LAYOUT_INITIAL_X_OFFSET_PX: 50, AUTO_LAYOUT_INITIAL_Y_OFFSET_PX: 50,
    DEFAULT_NEW_NODE_X: 100, DEFAULT_NEW_NODE_Y: 100,
};

const workspace = document.getElementById('workspace');
const workspaceContainer = document.getElementById('workspaceContainer');
const svgLayer = document.getElementById('connectionSvg');

// Define the updateSelectionVisualsManager function here since it's not exported from selectionManager.js
function updateSelectionVisualsManager(selectedContainers, drawCallback) {
    document.querySelectorAll('.gh-node-container, .gh-value-display-container').forEach(container => {
        const nodeElement = container.querySelector('.gh-node, .gh-value-display');
        if (nodeElement) {
            if (selectedContainers.includes(container)) {
                nodeElement.classList.add('selected');
            } else {
                nodeElement.classList.remove('selected');
            }
        }
    });
    
    if (typeof drawCallback === 'function') {
        drawCallback();
    }
}

function createNodeOnCanvas(componentGlobalAddress, x, y, isUserPlaced = false) {
    const compDef = getComponentLibrary()[componentGlobalAddress];
    if (!compDef) {
        console.warn(`Component definition not found for address: ${componentGlobalAddress}`);
        updateStatusBarInfo({ left: `Error: No component for ${componentGlobalAddress}` });
        return null;
    }

    let newNodeInstance;
    if (compDef.uiType === 'valueDisplay' && typeof ValueDisplayInstance !== 'undefined') {
        newNodeInstance = new ValueDisplayInstance(compDef, x, y, NODE_UI_CONFIG);
    } else {
        newNodeInstance = new NodeInstance(compDef, x, y, NODE_UI_CONFIG);
    }

    addActiveNodeInstance(newNodeInstance.instanceId, newNodeInstance);
    newNodeInstance.draw(workspace, addDragListenersToNodeJS, addAnchorListenersToNodeJS);

    if (isUserPlaced && getD3Simulation()) {
        newNodeInstance.fx = x;
        newNodeInstance.fy = y;
        setD3NodeFixed(getD3Simulation(), newNodeInstance.instanceId, x, y);
    }

    updateGraphAndLayout(true);
    updateStatusBarInfo({ left: `Added: ${newNodeInstance.nickName}` });
    return newNodeInstance;
}

function addConnectionToState(sourceNodeId, sourceAnchorDefAddr, targetNodeId, targetAnchorDefAddr) {
    const sourceNode = getNodeInstance(sourceNodeId);
    const targetNode = getNodeInstance(targetNodeId);

    if (!sourceNode || !targetNode) {
        console.warn("Source or target node not found for connection.");
        return null;
    }

    const sourceAnchor = sourceNode.getAnchorByDefAddress(sourceAnchorDefAddr);
    const targetAnchor = targetNode.getAnchorByDefAddress(targetAnchorDefAddr);

    if (!sourceAnchor || !targetAnchor || !sourceAnchor.canConnectTo(targetAnchor)) {
        console.warn(`Connection not allowed between ${sourceNode.nickName}.${sourceAnchor ? sourceAnchor.nickName : 'undefined'} and ${targetNode.nickName}.${targetAnchor ? targetAnchor.nickName : 'undefined'}.`);
        return null;
    }

    const newConnection = new Connection(sourceNodeId, sourceAnchorDefAddr, targetNodeId, targetAnchorDefAddr);
    addActiveConnection(newConnection.connectionId, newConnection);
    sourceAnchor.addConnection(newConnection.connectionId);
    targetAnchor.addConnection(newConnection.connectionId);

    updateGraphAndLayout(true);
    return newConnection;
}

function removeConnectionFromState(connectionId) {
    const conn = getConnection(connectionId);
    if (conn) {
        const sourceNode = getNodeInstance(conn.sourceNodeInstanceId);
        const targetNode = getNodeInstance(conn.targetNodeInstanceId);
        if (sourceNode) {
            const sourceAnchor = sourceNode.getAnchorByDefAddress(conn.sourceAnchorDefinitionAddress);
            if (sourceAnchor) sourceAnchor.removeConnection(connectionId);
        }
        if (targetNode) {
            const targetAnchor = targetNode.getAnchorByDefAddress(conn.targetAnchorDefinitionAddress);
            if (targetAnchor) targetAnchor.removeConnection(connectionId);
        }
        conn.removeDomElement();
        removeActiveConnection(connectionId);
        updateGraphAndLayout(true);
    }
}

function removeNodeFromState(nodeInstanceId) {
    const nodeInstance = getNodeInstance(nodeInstanceId);
    if (nodeInstance) {
        nodeInstance.remove(getActiveConnections());
        removeActiveNodeInstance(nodeInstanceId);
        updateGraphAndLayout(true);
    }
}

function addDragListenersToNodeJS(nodeDomElement, nodeInstance) {
    initNodeDrag(nodeDomElement, nodeInstance, {
        getPanZoomState,
        getMousePosInWorkspace: getMousePosFromPanZoom,
        setNodeFixedPositionInLayout: (id, x, y) => {
            if (getD3Simulation()) setD3NodeFixed(getD3Simulation(), id, x, y);
            const inst = getNodeInstance(id);
            if (inst) { inst.fx = x; inst.fy = y; }
        },
        releaseNodeFixedPositionInLayout: (id) => {
            if (getD3Simulation()) releaseD3NodeFixed(getD3Simulation(), id);
            const inst = getNodeInstance(id);
            if (inst) { inst.fx = null; inst.fy = null; }
        },
        onDragMove: drawAllConnectionsJS,
        onDragEnd: () => { if (getD3Simulation()) getD3Simulation().alphaTarget(0).restart(); },
        isShiftPressed: getIsShiftKeyPressed,
        getSelectedNodes: getSelectedNodeContainers,
        getAllNodes: getActiveNodeInstances,
        updateSelectionVisuals: (selContainers) => updateSelectionVisualsManager(selContainers, drawAllConnectionsJS),
        setNodeDragInProgress,
        updateNodeSelectionOnClick
    });
}

function addAnchorListenersToNodeJS(anchorDomElement, nodeInstanceId, anchorDefAddress, anchorType) {
    initWireManagerEvents(anchorDomElement, nodeInstanceId, anchorDefAddress, anchorType, {
        getMousePosInWorkspace: getMousePosFromPanZoom,
        getPanZoomState,
        addConnection: addConnectionToState,
        svgLayer,
        activeNodeInstances: getActiveNodeInstances(),
        onWireDragEnd: drawAllConnectionsJS
    });
}

function drawAllConnectionsJS() {
    if (!svgLayer) return;
    const currentWires = svgLayer.querySelectorAll('.wire:not(.temp-wire)');
    currentWires.forEach(w => w.remove());

    const wireDragInfo = getWireDragSource ? getWireDragSource() : null;
    if (isWireManagerDragging() && wireDragInfo && wireDragInfo.tempWireElement) {
         svgLayer.appendChild(wireDragInfo.tempWireElement);
    }

    const activeConnections = getActiveConnections();
    const activeNodes = getActiveNodeInstances();
    const selectedContainers = getSelectedNodeContainers();
    
    if (activeConnections && activeNodes && selectedContainers) {
        Object.values(activeConnections).forEach(conn => {
            if (conn && conn.draw) {
                conn.draw(svgLayer, activeNodes, new Set(selectedContainers.map(c => c.dataset.id || c.querySelector('.gh-node, .gh-value-display')?.id)));
            }
        });
    }
}

function updateGraphAndLayout(forceReheat = false) {
    const simulation = getD3Simulation();
    const activeNodes = getActiveNodeInstances();
    const activeConnections = getActiveConnections();
    
    if (!activeNodes || !activeConnections) {
        console.warn("No active nodes or connections available for layout update");
        return;
    }
    
    if (simulation) {
        updateLayoutData(simulation, activeNodes, activeConnections);
        if (forceReheat) reheatD3Simulation(simulation, 0.5);
    } else {
        simpleFallbackLayout();
    }
    drawAllConnectionsJS();
    updateStatusBarInfo({
        nodes: Object.keys(activeNodes).length,
        connections: Object.keys(activeConnections).length
    });
}

function simpleFallbackLayout() {
    const activeNodes = getActiveNodeInstances();
    if (!activeNodes) return;
    
    let currentX = NODE_UI_CONFIG.AUTO_LAYOUT_INITIAL_X_OFFSET_PX;
    let currentY = NODE_UI_CONFIG.AUTO_LAYOUT_INITIAL_Y_OFFSET_PX;
    Object.values(activeNodes).forEach((nodeInst) => {
        if (nodeInst.fx === null && nodeInst.fy === null) {
            nodeInst.updatePosition(currentX, currentY);
            currentY += nodeInst.height + NODE_UI_CONFIG.AUTO_LAYOUT_ROW_HEIGHT_PX / 2;
            if (currentY > (workspaceContainer.clientHeight * 0.7 / getPanZoomState().scale)) {
                currentY = NODE_UI_CONFIG.AUTO_LAYOUT_INITIAL_Y_OFFSET_PX;
                currentX += NODE_UI_CONFIG.AUTO_LAYOUT_COL_WIDTH_PX + 50;
            }
        } else {
            nodeInst.updatePosition(nodeInst.fx, nodeInst.fy);
        }
    });
}

function clearGraph() {
    const currentNodes = getActiveNodeInstances();
    const currentConnections = getActiveConnections();
    const currentSvgLayer = svgLayer;
    const currentD3Sim = getD3Simulation();

    if (currentNodes && currentConnections) {
        clearGraphFromRecipeManager(currentNodes, currentConnections, currentSvgLayer, () => {
            if (currentD3Sim) stopD3Simulation(currentD3Sim);
            setD3Simulation(null);
        });
    } else {
        console.warn("No nodes or connections to clear");
    }

    updateGraphAndLayout();
}

// For global access to the actions
window.actions = {};

async function initApp() {
    // Load components first and ensure they're available before proceeding
    const loadedComponentData = await loadAndParseAllComponents('./assets/components.json');
    if (!loadedComponentData) {
        updateStatusBarInfo({ left: "FATAL: Could not load components.json." });
        return;
    }
    
    // Set the component library and categories from the loaded data
    setComponentLibrary(loadedComponentData.library);
    setComponentCategories(loadedComponentData.categories);

    // Initialize any empty objects that might be null
    if (!getActiveNodeInstances()) {
        clearActiveNodeInstances();
    }
    
    if (!getActiveConnections()) {
        clearActiveConnections();
    }
    
    // Debug: Log available component addresses after loading
    let localComponentLibrary = getComponentLibrary() || {};
    console.log("Available component count:", Object.keys(localComponentLibrary).length);
    console.log("Component C0006 exists:", localComponentLibrary["C0006"] !== undefined);
    console.log("Component C0007 exists:", localComponentLibrary["C0007"] !== undefined);
    console.log("Component C0009 exists:", localComponentLibrary["C0009"] !== undefined);

    // Only implement recipes if components are loaded successfully
    if (Object.keys(localComponentLibrary).length > 0) {
        try {
            const simpleRecipeString = JSON.stringify({
                "nodes_to_create": [
                    { "id_in_recipe": "test1", "type_address": "C0006", "x": 150, "y": 150 }
                ],
                "connections": []
            });
            
            // Use the actual method to parse
            parseAndImplementRecipe(
                simpleRecipeString, 
                createNodeOnCanvas, 
                addConnectionToState, 
                clearGraph, 
                getActiveNodeInstances(), 
                getActiveConnections()
            );
            
            console.log("Simple recipe implemented successfully");
            
            // Now try the original recipe
            const demoRecipeString = JSON.stringify({
                "nodes_to_create": [
                    { "id_in_recipe": "minc1", "type_address": "C0006", "x": 150, "y": 150, "nickNameOverride": "TestMInc" },
                    { "id_in_recipe": "styles1", "type_address": "C0007", "x": 500, "y": 100 },
                    { "id_in_recipe": "cpc1", "type_address": "C0009", "x": 150, "y": 450 }
                ],
                "connections": [
                    { "from_node_id": "minc1", "from_anchor_address": "C0006.O01", "to_node_id": "cpc1", "to_anchor_address": "C0009.I04" }
                ]
            });
            
            parseAndImplementRecipe(
                demoRecipeString, 
                createNodeOnCanvas, 
                addConnectionToState, 
                clearGraph, 
                getActiveNodeInstances(), 
                getActiveConnections()
            );
        } catch (e) {
            console.error("Error implementing recipe:", e);
            console.error("Error details:", e.message, e.stack);
        }
    } else {
        console.warn("Component library not loaded yet. Skipping initial recipe implementation.");
    }

    initPanZoom(workspaceContainer, workspace, getPanZoomState(), () => {
        applyPanZoomTransformation(workspace, svgLayer, getPanZoomState());
        if (getD3Simulation()) updateD3Center(getD3Simulation(), workspaceContainer, getPanZoomState());
        drawAllConnectionsJS();
        updateStatusBarInfo();
    });

    initSelectionHandling(workspaceContainer, svgLayer, getActiveNodeInstances(), getPanZoomState, getMousePosFromPanZoom, (selContainers) => updateSelectionVisualsManager(selContainers, drawAllConnectionsJS), getIsShiftKeyPressed);

    initStatusBar(
        document.getElementById('statusBar'),
        document.getElementById('statusInfoLeft'),
        document.getElementById('statusInfoCoords'),
        document.getElementById('statusInfoRight'),
        getPanZoomState
    );
    workspaceContainer.addEventListener('mousemove', (e) => {
        const mousePos = getMousePosFromPanZoom(e);
        updateCoordsDisplay(mousePos.x, mousePos.y);
    });

    initSyntaxInput(
        document.getElementById('recipeSyntaxInput'),
        document.getElementById('btnSubmitRecipeSyntax'),
        (syntaxString) => {
            const success = parseAndImplementRecipe(
                syntaxString,
                createNodeOnCanvas,
                addConnectionToState,
                clearGraph,
                getActiveNodeInstances(),
                getActiveConnections()
            );
            if (success) {
                if (!getD3Simulation() && Object.keys(getActiveNodeInstances() || {}).length > 0) {
                     const sim = initForceDirectedLayout(getActiveNodeInstances(), getActiveConnections(), workspaceContainer, getPanZoomState(),
                        (simNodesData) => {
                            simNodesData.forEach(simNode => {
                                const nodeInst = getNodeInstance(simNode.id);
                                if (nodeInst && (nodeInst.fx === null && nodeInst.fy === null) ) {
                                     nodeInst.updatePosition(simNode.x, simNode.y);
                                } else if (nodeInst && nodeInst.fx !== null && nodeInst.fy !== null) {
                                     nodeInst.updatePosition(nodeInst.fx, nodeInst.fy);
                                }
                            });
                            drawAllConnectionsJS();
                        }
                    );
                    setD3Simulation(sim);
                }
                 updateGraphAndLayout(true);
            }
        }
    );

    window.actions = {
        implementJsonRecipeFromString: (str) => {
            const success = parseAndImplementRecipe(str, createNodeOnCanvas, addConnectionToState, clearGraph, getActiveNodeInstances(), getActiveConnections());
            if (success) {
                 if (!getD3Simulation() && Object.keys(getActiveNodeInstances() || {}).length > 0) {
                     const sim = initForceDirectedLayout(getActiveNodeInstances(), getActiveConnections(), workspaceContainer, getPanZoomState(),
                        (simNodesData) => {
                            simNodesData.forEach(simNode => {
                                const nodeInst = getNodeInstance(simNode.id);
                                if (nodeInst && (nodeInst.fx === null && nodeInst.fy === null) ) {
                                     nodeInst.updatePosition(simNode.x, simNode.y);
                                } else if (nodeInst && nodeInst.fx !== null && nodeInst.fy !== null) {
                                     nodeInst.updatePosition(nodeInst.fx, nodeInst.fy);
                                }
                            });
                            drawAllConnectionsJS();
                        }
                    );
                    setD3Simulation(sim);
                 }
                updateGraphAndLayout(true);
            }
        },
        clearCurrentGraph: clearGraph,
        reheatLayout: () => {
            Object.values(getActiveNodeInstances() || {}).forEach(ni => {
                ni.fx = null; ni.fy = null;
                if (getD3Simulation()) releaseD3NodeFixed(getD3Simulation(), ni.instanceId);
            });
            if (getD3Simulation()) reheatD3Simulation(getD3Simulation(), 1); else simpleFallbackLayout();
            updateGraphAndLayout();
        },
        clearSelection: () => clearSelectionManager( (sel) => updateSelectionVisualsManager(sel, drawAllConnectionsJS)),
        deleteSelectedNodes: () => {
            getSelectedNodeContainers().forEach(container => {
                const nodeId = container.dataset.id || container.querySelector('.gh-node, .gh-value-display')?.id;
                if (nodeId) removeNodeFromState(nodeId);
            });
            clearSelectedNodeContainers();
            updateSelectionVisualsManager(getSelectedNodeContainers(), drawAllConnectionsJS);
        },
        toggleGrid: () => workspace.classList.toggle('no-grid-pattern'),
        toggleWires: () => svgLayer.classList.toggle('hide-wires'),
        saveGraph: () => {
            const recipeString = generateRecipeFromGraph(getActiveNodeInstances(), getActiveConnections());
            const blob = new Blob([recipeString], {type: "application/json;charset=utf-8"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "graph_recipe.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            updateStatusBarInfo({left: "Graph saved to graph_recipe.json"});
        }
    };

    initToolbar({
        btnLoadRecipeFromFile: document.getElementById('btnLoadRecipeFromFile'),
        recipeFileInput: document.getElementById('recipeFileInput'),
        btnSaveGraph: document.getElementById('btnSaveGraph'),
        btnResetLayout: document.getElementById('btnResetLayout'),
        btnClearSelection: document.getElementById('btnClearSelection'),
        btnDeleteSelected: document.getElementById('btnDeleteSelected'),
        btnToggleGrid: document.getElementById('btnToggleGrid'),
        btnToggleConnections: document.getElementById('btnToggleConnections')
    }, window.actions);

    // Debug: Log available component addresses before trying to use them
    let localComponentLibrary = getComponentLibrary() || {};
    console.log("Available component count:", Object.keys(localComponentLibrary).length);
    console.log("Component C0006 exists:", localComponentLibrary["C0006"] !== undefined);
    console.log("Component C0007 exists:", localComponentLibrary["C0007"] !== undefined);
    console.log("Component C0009 exists:", localComponentLibrary["C0009"] !== undefined);

    // Only try to implement recipes if we have components loaded
    if (Object.keys(localComponentLibrary).length > 0) {
        try {
            const simpleRecipeString = JSON.stringify({
                "nodes_to_create": [
                    { "id_in_recipe": "test1", "type_address": "C0006", "x": 150, "y": 150 }
                ],
                "connections": []
            });
            
            // Use the actual method to parse
            parseAndImplementRecipe(
                simpleRecipeString, 
                createNodeOnCanvas, 
                addConnectionToState, 
                clearGraph, 
                getActiveNodeInstances(), 
                getActiveConnections()
            );
            
            console.log("Simple recipe implemented successfully");
            
            // Now try the original recipe
            const demoRecipeString = JSON.stringify({
                "nodes_to_create": [
                    { "id_in_recipe": "minc1", "type_address": "C0006", "x": 150, "y": 150, "nickNameOverride": "TestMInc" },
                    { "id_in_recipe": "styles1", "type_address": "C0007", "x": 500, "y": 100 },
                    { "id_in_recipe": "cpc1", "type_address": "C0009", "x": 150, "y": 450 }
                ],
                "connections": [
                    { "from_node_id": "minc1", "from_anchor_address": "C0006.O01", "to_node_id": "cpc1", "to_anchor_address": "C0009.I04" }
                ]
            });
            
            parseAndImplementRecipe(
                demoRecipeString, 
                createNodeOnCanvas, 
                addConnectionToState, 
                clearGraph, 
                getActiveNodeInstances(), 
                getActiveConnections()
            );
        } catch (e) {
            console.error("Error implementing recipe:", e);
            console.error("Error details:", e.message, e.stack);
        }
    } else {
        console.warn("Component library not loaded yet. Skipping initial recipe implementation.");
    }

    if (typeof d3 !== 'undefined' && Object.keys(getActiveNodeInstances() || {}).length > 0) {
        const sim = initForceDirectedLayout(getActiveNodeInstances(), getActiveConnections(), workspaceContainer, getPanZoomState(),
            (simNodesData) => {
                simNodesData.forEach(simNode => {
                    const nodeInst = getNodeInstance(simNode.id);
                     if (nodeInst && (nodeInst.fx === null && nodeInst.fy === null) ) {
                         nodeInst.updatePosition(simNode.x, simNode.y);
                    } else if (nodeInst && nodeInst.fx !== null && nodeInst.fy !== null) {
                         nodeInst.updatePosition(nodeInst.fx, nodeInst.fy);
                    }
                });
                drawAllConnectionsJS();
            }
        );
        setD3Simulation(sim);
    } else {
        simpleFallbackLayout();
        drawAllConnectionsJS();
    }

    applyPanZoomTransformation(workspace, svgLayer, getPanZoomState());
    updateStatusBarInfo();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') setIsShiftKeyPressed(true);
        const activeElement = document.activeElement;
        const isTyping = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
        if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
            if (window.actions.deleteSelectedNodes) window.actions.deleteSelectedNodes();
        }
    });
    document.addEventListener('keyup', (e) => { if (e.key === 'Shift') setIsShiftKeyPressed(false); });
}

document.addEventListener('DOMContentLoaded', initApp);

window.addEventListener('resize', () => {
    applyPanZoomTransformation(workspace, svgLayer, getPanZoomState());
    const sim = getD3Simulation();
    if (sim) {
        updateD3Center(sim, workspaceContainer, getPanZoomState());
        reheatD3Simulation(sim, 0.3);
    } else {
        simpleFallbackLayout();
    }
    drawAllConnectionsJS();
});