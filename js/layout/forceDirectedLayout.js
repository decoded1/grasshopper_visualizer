let d3SimulationInstance = null;
let nodeInstancesMapRef = null;
let activeConnectionsMapRef = null;
let workspaceContainerRef = null;
let panZoomStateRef = null;
let tickCallback = null;

export function initForceDirectedLayout(
    initialNodesMap,
    initialConnectionsMap,
    wsContainer,
    initialPanZoomState,
    onTickCallback
) {
    if (typeof d3 === 'undefined') {
        console.error("D3.js is not loaded. Cannot initialize force-directed layout.");
        return null;
    }

    nodeInstancesMapRef = initialNodesMap;
    activeConnectionsMapRef = initialConnectionsMap;
    workspaceContainerRef = wsContainer;
    panZoomStateRef = initialPanZoomState;
    tickCallback = onTickCallback;

    const simNodes = Object.values(nodeInstancesMapRef).map(ni => ({
        id: ni.instanceId,
        x: ni.x, y: ni.y,
        fx: ni.fx, fy: ni.fy,
        width: ni.width || 120,
        height: ni.height || 70
    }));

    const simLinks = Object.values(activeConnectionsMapRef).map(conn => ({
        source: conn.sourceNodeInstanceId,
        target: conn.targetNodeInstanceId
    }));

    const centerX = (workspaceContainerRef.clientWidth / 2 / panZoomStateRef.scale) - (panZoomStateRef.x / panZoomStateRef.scale);
    const centerY = (workspaceContainerRef.clientHeight / 2 / panZoomStateRef.scale) - (panZoomStateRef.y / panZoomStateRef.scale);

    d3SimulationInstance = d3.forceSimulation(simNodes)
        .force("link", d3.forceLink(simLinks)
                         .id(d => d.id)
                         .distance(200)
                         .strength(0.03))
        .force("charge", d3.forceManyBody()
                           .strength(-400)
                           .distanceMax(500))
        .force("center", d3.forceCenter(centerX, centerY).strength(0.01))
        .force("collide", d3.forceCollide()
                            .radius(d => Math.max(d.width, d.height) * 0.7 + 30)
                            .strength(0.9))
        .on("tick", () => {
            if (tickCallback) {
                tickCallback(d3SimulationInstance.nodes());
            }
        });
    return d3SimulationInstance;
}

export function updateLayoutData(simulation, newNodesMap, newConnectionsMap) {
    if (!simulation) return;
    nodeInstancesMapRef = newNodesMap;
    activeConnectionsMapRef = newConnectionsMap;

    const simNodes = Object.values(nodeInstancesMapRef).map(ni => {
        const existingSimNode = simulation.nodes().find(sn => sn.id === ni.instanceId);
        return {
            id: ni.instanceId,
            x: existingSimNode ? existingSimNode.x : ni.x,
            y: existingSimNode ? existingSimNode.y : ni.y,
            fx: ni.fx, fy: ni.fy,
            width: ni.width || 120,
            height: ni.height || 70
        };
    });

    const simLinks = Object.values(activeConnectionsMapRef).map(conn => ({
        source: conn.sourceNodeInstanceId,
        target: conn.targetNodeInstanceId
    }));

    simulation.nodes(simNodes);
    simulation.force("link").links(simLinks);
}

export function setNodeFixedPosition(simulation, nodeInstanceId, x, y) {
    if (!simulation) return;
    const simNode = simulation.nodes().find(n => n.id === nodeInstanceId);
    if (simNode) {
        simNode.fx = x;
        simNode.fy = y;
    }
}

export function releaseNodeFixedPosition(simulation, nodeInstanceId) {
     if (!simulation) return;
    const simNode = simulation.nodes().find(n => n.id === nodeInstanceId);
    if (simNode) {
        simNode.fx = null;
        simNode.fy = null;
    }
}

export function reheatSimulation(simulation, alpha = 0.3) {
    if (simulation) {
        simulation.alpha(alpha).restart();
    }
}

export function updateLayoutCenterTarget(simulation, wsContainer, newPanZoomState) {
    if (!simulation || !wsContainer) return;
    panZoomStateRef = newPanZoomState;
    const centerX = (wsContainer.clientWidth / 2 / panZoomStateRef.scale) - (panZoomStateRef.x / panZoomStateRef.scale);
    const centerY = (wsContainer.clientHeight / 2 / panZoomStateRef.scale) - (panZoomStateRef.y / panZoomStateRef.scale);
    const centerForce = simulation.force("center");
    if (centerForce) {
        centerForce.x(centerX).y(centerY);
    }
}

export function stopSimulation(simulation) {
    if(simulation) {
        simulation.stop();
    }
}

export function getD3SimulationInstance() {
    return d3SimulationInstance;
}