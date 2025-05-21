import { getComponentDefinition } from './componentLoader.js';

export function parseAndImplementRecipe(
    recipeString,
    createNodeFunc,
    addConnectionFunc,
    clearGraphFunc,
    activeNodes,
    activeConnections
) {
    if (!recipeString.trim()) {
        console.warn("Recipe string is empty.");
        if (window.updateStatusBarInfo) window.updateStatusBarInfo({ left: "Recipe input empty." });
        return false;
    }

    try {
        const recipe = JSON.parse(recipeString);

        if (clearGraphFunc) {
            clearGraphFunc(activeNodes, activeConnections, document.getElementById('connectionSvg'));
        }

        const recipeNodeIdToInstanceIdMap = {};

        if (recipe.nodes_to_create && Array.isArray(recipe.nodes_to_create)) {
            recipe.nodes_to_create.forEach(nodeToCreate => {
                const { id_in_recipe, type_address, x, y, nickNameOverride, value } = nodeToCreate;
                const compDef = getComponentDefinition(type_address);

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

                    if (nickNameOverride) {
                        newNodeInstance.nickName = nickNameOverride;
                        const titleSpan = newNodeInstance.headerElement.querySelector('.gh-node-title span');
                        if(titleSpan) titleSpan.textContent = nickNameOverride;
                    }
                    
                    if (value !== undefined && newNodeInstance.updateDisplayedValue) {
                        newNodeInstance.updateDisplayedValue(value);
                    }
                    
                    if (newNodeInstance.domElement && x !== undefined && y !== undefined) {
                         if(window.d3SimulationInstance && window.setNodeFixedPosition) {
                             window.setNodeFixedPosition(window.d3SimulationInstance, newNodeInstance.instanceId, posX, posY);
                         }
                         newNodeInstance.fx = posX;
                         newNodeInstance.fy = posY;
                    }
                }
            });
        } else {
            console.warn("Recipe does not contain 'nodes_to_create' array or it's invalid.");
        }

        if (recipe.connections && Array.isArray(recipe.connections)) {
            recipe.connections.forEach(connToCreate => {
                const { from_node_id, from_anchor_address, to_node_id, to_anchor_address } = connToCreate;
                const sourceInstanceId = recipeNodeIdToInstanceIdMap[from_node_id];
                const targetInstanceId = recipeNodeIdToInstanceIdMap[to_node_id];

                if (!sourceInstanceId || !targetInstanceId) {
                    console.warn(`Could not map recipe node IDs to instance IDs for connection: ${from_node_id} -> ${to_node_id}. Skipping.`);
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
        } else {
            console.warn("Recipe does not contain 'connections' array or it's invalid.");
        }
        if (window.updateStatusBarInfo) window.updateStatusBarInfo({ left: `Recipe implemented: ${Object.keys(recipeNodeIdToInstanceIdMap).length} nodes.` });
        return true;

    } catch (e) {
        console.error("Error parsing or implementing JSON recipe in RecipeManager:", e);
        alert("Invalid JSON recipe syntax. Please check the console for details and ensure the format is correct.\n\nExpected format:\n" +
              `{\n` +
              `  "nodes_to_create": [ { "id_in_recipe": "uniqueId", "type_address": "C_ADDR", "x": X, "y": Y, "nickNameOverride": "OptionalName", "value": OptionalValue }, ... ],\n` +
              `  "connections": [ { "from_node_id": "uniqueId", "from_anchor_address": "C_ADDR.Oxx", "to_node_id": "anotherId", "to_anchor_address": "C_ADDR.Iyy" }, ... ]\n` +
              `}`);
        if (window.updateStatusBarInfo) window.updateStatusBarInfo({ left: "Error: Invalid recipe syntax." });
        return false;
    }
}

export function generateRecipeFromGraph(activeNodes, activeConnections) {
    const recipe = {
        nodes_to_create: [],
        connections: []
    };

    const instanceIdToRecipeIdMap = {};
    let recipeIdCounter = 0;

    Object.values(activeNodes).forEach(nodeInst => {
        const recipeNodeId = `node${recipeIdCounter++}`;
        instanceIdToRecipeIdMap[nodeInst.instanceId] = recipeNodeId;
        const nodeData = {
            id_in_recipe: recipeNodeId,
            type_address: nodeInst.componentAddress,
            x: Math.round(nodeInst.x),
            y: Math.round(nodeInst.y)
        };
        if (nodeInst.nickName !== nodeInst.componentDefinition.nickName) {
            nodeData.nickNameOverride = nodeInst.nickName;
        }
        if (nodeInst.currentValue !== undefined && nodeInst.componentDefinition.uiType === 'valueDisplay') {
             nodeData.value = nodeInst.currentValue;
        }
        recipe.nodes_to_create.push(nodeData);
    });

    Object.values(activeConnections).forEach(conn => {
        const sourceRecipeId = instanceIdToRecipeIdMap[conn.sourceNodeInstanceId];
        const targetRecipeId = instanceIdToRecipeIdMap[conn.targetNodeInstanceId];

        if (sourceRecipeId && targetRecipeId) {
            recipe.connections.push({
                from_node_id: sourceRecipeId,
                from_anchor_address: conn.sourceAnchorDefinitionAddress,
                to_node_id: targetRecipeId,
                to_anchor_address: conn.targetAnchorDefinitionAddress
            });
        }
    });

    return JSON.stringify(recipe, null, 2);
}