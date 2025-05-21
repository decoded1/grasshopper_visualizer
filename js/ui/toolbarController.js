let btnLoadRecipeFile = null;
let recipeFileInput = null;
let btnSaveGraph = null;
let btnResetLayout = null;
let btnClearSelection = null;
let btnDeleteSelected = null;
let btnToggleGrid = null;
let btnToggleConnections = null;

let actions = {};

export function initToolbar(elements, callbackActions) {
    btnLoadRecipeFile = elements.btnLoadRecipeFromFile;
    recipeFileInput = elements.recipeFileInput;
    btnSaveGraph = elements.btnSaveGraph;
    btnResetLayout = elements.btnResetLayout;
    btnClearSelection = elements.btnClearSelection;
    btnDeleteSelected = elements.btnDeleteSelected;
    btnToggleGrid = elements.btnToggleGrid;
    btnToggleConnections = elements.btnToggleConnections;
    actions = callbackActions;

    if (btnLoadRecipeFile && recipeFileInput) {
        btnLoadRecipeFile.addEventListener('click', () => recipeFileInput.click());
        recipeFileInput.addEventListener('change', handleFileLoad);
    }
    if (btnSaveGraph && actions.saveGraph) {
        btnSaveGraph.addEventListener('click', actions.saveGraph);
    }
    if (btnResetLayout && actions.reheatLayout) {
        btnResetLayout.addEventListener('click', actions.reheatLayout);
    }
    if (btnClearSelection && actions.clearSelection) {
        btnClearSelection.addEventListener('click', actions.clearSelection);
    }
    if (btnDeleteSelected && actions.deleteSelectedNodes) {
        btnDeleteSelected.addEventListener('click', actions.deleteSelectedNodes);
    }
    if (btnToggleGrid && actions.toggleGrid) {
        btnToggleGrid.addEventListener('click', actions.toggleGrid);
    }
    if (btnToggleConnections && actions.toggleWires) {
        btnToggleConnections.addEventListener('click', actions.toggleWires);
    }
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (actions.implementJsonRecipeFromString) {
                if (actions.clearCurrentGraph) actions.clearCurrentGraph();
                actions.implementJsonRecipeFromString(e.target.result);
            }
        };
        reader.onerror = (e) => {
            console.error("Error reading file:", e);
            alert("Error reading file.");
        };
        reader.readAsText(file);
        event.target.value = null;
    }
}