import { generateUUID } from '../core/utils.js';

let recipeTextareaElement = null;
let submitButtonElement = null;
let implementRecipeCallback = null;
let getComponentLibraryCallback = null;
let createNodeOnCanvasCallback = null;
let currentActiveNodesRef = null;
let currentActiveConnectionsRef = null;
let addConnectionCallbackRef = null;


export function initSyntaxInput(
    textareaEl,
    buttonEl,
    onImplement,
    getLibraryFunc,
    createNodeFunc,
    activeNodes,
    activeConnections,
    addConnectionFunc
) {
    recipeTextareaElement = textareaEl;
    submitButtonElement = buttonEl;
    implementRecipeCallback = onImplement;
    getComponentLibraryCallback = getLibraryFunc;
    createNodeOnCanvasCallback = createNodeFunc;
    currentActiveNodesRef = activeNodes;
    currentActiveConnectionsRef = activeConnections;
    addConnectionCallbackRef = addConnectionFunc;


    if (recipeTextareaElement) {
        recipeTextareaElement.addEventListener('input', () => autoResizeTextarea(recipeTextareaElement));
        recipeTextareaElement.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (submitButtonElement) submitButtonElement.click();
            }
        });
        autoResizeTextarea(recipeTextareaElement);
    }

    if (submitButtonElement) {
        submitButtonElement.addEventListener('click', handleSubmitSyntax);
    }
}

function handleSubmitSyntax() {
    if (recipeTextareaElement && implementRecipeCallback) {
        const syntaxString = recipeTextareaElement.value;
        implementRecipeCallback(syntaxString);
    }
}

export function implementJsonRecipeFromString(
    jsonString,
    createNodeFunc,
    getLibraryFunc,
    activeNodes,
    activeConnections,
    addConnectionFunc
    ) {
    if (!jsonString.trim()) {
        console.warn("Recipe string is empty.");
        return;
    }
    try {
        const recipe = JSON.parse(jsonString);
        const recipeNodeIdToInstanceIdMap = {};

        if (recipe.nodes_to_create && Array.isArray(recipe.nodes_to_create)) {
            recipe.nodes_to_create.forEach(nodeToCreate => {
                const { id_in_recipe, type_address, x, y } = nodeToCreate;
                const compDef = getLibraryFunc()[type_address];

                if (!compDef) {
                    console.warn(`Component type ${type_address} for recipe ID ${id_in_recipe} not found. Skipping.`);
                    return;
                }
                const posX = (x !== undefined) ? x : 100;
                const posY = (y !== undefined) ? y : 100;

                const newNodeInstance = createNodeFunc(type_address, posX, posY, true);
                if (newNodeInstance) {
                    recipeNodeIdToInstanceIdMap[id_in_recipe] = newNodeInstance.instanceId;
                    activeNodes[newNodeInstance.instanceId] = newNodeInstance;
                    if (newNodeInstance.domElement && x !== undefined && y !== undefined) {
                        newNodeInstance.fx = posX;
                        newNodeInstance.fy = posY;
                    }
                }
            });
        }

        if (recipe.connections && Array.isArray(recipe.connections)) {
            recipe.connections.forEach(connToCreate => {
                const { from_node_id, from_anchor_address, to_node_id, to_anchor_address } = connToCreate;
                const sourceInstanceId = recipeNodeIdToInstanceIdMap[from_node_id];
                const targetInstanceId = recipeNodeIdToInstanceIdMap[to_node_id];

                if (!sourceInstanceId || !targetInstanceId) {
                    console.warn(`Could not find node instances for connection: ${from_node_id} -> ${to_node_id}. Skipping.`);
                    return;
                }
                const newConn = addConnectionFunc(
                    sourceInstanceId,
                    from_anchor_address,
                    targetInstanceId,
                    to_anchor_address
                );
                if (newConn) {
                    activeConnections[newConn.connectionId] = newConn;
                }
            });
        }
        if(recipeTextareaElement) recipeTextareaElement.value = "";
        autoResizeTextarea(recipeTextareaElement);


    } catch (e) {
        console.error("Error parsing or implementing JSON recipe:", e);
        alert("Invalid JSON recipe syntax. Please check the console for details and ensure the format is correct.");
    }
}


export function clearCurrentGraph(activeNodes, activeConnections, svgLayer) {
    Object.values(activeNodes).forEach(nodeInst => {
        if (nodeInst.remove) nodeInst.remove(activeConnections);
        else if (nodeInst.domElement) nodeInst.domElement.remove();
    });
    for (const key in activeNodes) { delete activeNodes[key]; }


    Object.values(activeConnections).forEach(conn => {
        if (conn.removeDomElement) conn.removeDomElement();
    });
    for (const key in activeConnections) { delete activeConnections[key]; }

    if(svgLayer) svgLayer.innerHTML = '';
    console.log("Graph cleared by recipe input.");
}


function autoResizeTextarea(textareaElement) {
    if (!textareaElement) return;
    textareaElement.style.height = 'auto';
    let newHeight = textareaElement.scrollHeight;
    const maxHeight = parseInt(getComputedStyle(textareaElement).maxHeight) || 200;
    const minHeight = parseInt(getComputedStyle(textareaElement).minHeight) || 38;

    if (newHeight < minHeight) newHeight = minHeight;
    if (newHeight > maxHeight) newHeight = maxHeight;

    textareaElement.style.height = newHeight + 'px';
}