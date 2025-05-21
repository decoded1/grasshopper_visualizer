// js/app-state.js

let _activeNodeInstances = {};
let _activeConnections = {};
let _componentLibrary = {};
let _componentCategories = {};
let _selectedNodeContainers = [];
let _panZoomState = { x: 0, y: 0, scale: 1 };
let _isShiftKeyPressed = false;
let _d3Simulation = null;

export function getActiveNodeInstances() {
    return _activeNodeInstances;
}
export function setActiveNodeInstances(nodes) {
    _activeNodeInstances = nodes;
}
export function addActiveNodeInstance(instanceId, instance) {
    _activeNodeInstances[instanceId] = instance;
}
export function removeActiveNodeInstance(instanceId) {
    delete _activeNodeInstances[instanceId];
}
export function getNodeInstance(instanceId) {
    return _activeNodeInstances[instanceId];
}
export function clearActiveNodeInstances() {
    _activeNodeInstances = {};
}


export function getActiveConnections() {
    return _activeConnections;
}
export function setActiveConnections(connections) {
    _activeConnections = connections;
}
export function addActiveConnection(connectionId, connection) {
    _activeConnections[connectionId] = connection;
}
export function removeActiveConnection(connectionId) {
    delete _activeConnections[connectionId];
}
export function getConnection(connectionId) {
    return _activeConnections[connectionId];
}
export function clearActiveConnections() {
    _activeConnections = {};
}


export function getComponentLibrary() {
    return _componentLibrary;
}
export function setComponentLibrary(library) {
    _componentLibrary = library;
}

export function getComponentCategories() {
    return _componentCategories;
}
export function setComponentCategories(categories) {
    _componentCategories = categories;
}

export function getSelectedNodeContainers() {
    return _selectedNodeContainers;
}
export function setSelectedNodeContainers(containers) {
    _selectedNodeContainers = containers;
}
export function addSelectedNodeContainer(container) {
    if (!_selectedNodeContainers.includes(container)) {
        _selectedNodeContainers.push(container);
    }
}
export function removeSelectedNodeContainer(container) {
    _selectedNodeContainers = _selectedNodeContainers.filter(c => c !== container);
}
export function clearSelectedNodeContainers() {
    _selectedNodeContainers = [];
}

export function getPanZoomState() {
    return { ..._panZoomState };
}
export function setPanZoomState(newState) {
    _panZoomState = { ..._panZoomState, ...newState };
}

export function getIsShiftKeyPressed() {
    return _isShiftKeyPressed;
}
export function setIsShiftKeyPressed(isPressed) {
    _isShiftKeyPressed = isPressed;
}

export function getD3Simulation() {
    return _d3Simulation;
}
export function setD3Simulation(simulationInstance) {
    _d3Simulation = simulationInstance;
}