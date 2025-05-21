let componentLibrary = {};
let componentCategories = {};

async function fetchComponentData(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${filePath}`);
        }
        const jsonData = await response.json();
        return jsonData;
    } catch (error) {
        console.error("Could not load or parse component data:", error);
        return null;
    }
}

function processComponentData(jsonData) {
    const tempLibrary = {};
    const tempCategories = {};

    if (jsonData && Array.isArray(jsonData)) {
        jsonData.forEach(compDef => {
            if (compDef && compDef.global_address) {
                tempLibrary[compDef.global_address] = compDef;

                if (compDef.category && compDef.subCategory) {
                    if (!tempCategories[compDef.category]) {
                        tempCategories[compDef.category] = {};
                    }
                    if (!tempCategories[compDef.category][compDef.subCategory]) {
                        tempCategories[compDef.category][compDef.subCategory] = [];
                    }
                    tempCategories[compDef.category][compDef.subCategory].push(compDef);
                }
            } else {
                console.warn("Invalid component definition found (missing global_address):", compDef);
            }
        });
    } else {
        console.error("Fetched component data is not a valid array.");
    }
    return { library: tempLibrary, categories: tempCategories };
}

export async function loadAndParseAllComponents(filePath) {
    const jsonData = await fetchComponentData(filePath);
    if (jsonData) {
        const processedData = processComponentData(jsonData);
        componentLibrary = processedData.library;
        componentCategories = processedData.categories;
        console.log("Component library loaded:", Object.keys(componentLibrary).length, "components.");
        return processedData;
    }
    console.error("Failed to load and process component data from:", filePath);
    return null;
}

export function getComponentDefinition(globalAddress) {
    return componentLibrary[globalAddress] || null;
}

export function getAllComponentDefinitions() {
    return Object.values(componentLibrary);
}

export function getComponentCategories() {
    return componentCategories;
}

export function getComponentLibrary() {
    return componentLibrary;
}